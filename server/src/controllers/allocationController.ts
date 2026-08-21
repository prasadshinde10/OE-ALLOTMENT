import { Request, Response } from 'express';
import { allocateSeat } from '../services/allocationService';
import Elective from '../models/Elective';
import Student from '../models/Student';
import { logAudit } from '../services/auditService';

export const allocateElective = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { electiveId } = req.body;

    const result = await allocateSeat(user.userId, electiveId);

    const io = req.app.get('io');
    if (io) {
      io.to(`year-${result.student.year}`).emit('seat-changed', {
        electiveId: result.elective._id,
        seatsFilled: result.elective.seatsFilled,
        capacity: result.elective.capacity
      });
    }

    await logAudit({
      action: 'ALLOCATE_SEAT',
      actorId: user.userId,
      actorRole: 'student',
      targetType: 'student',
      targetId: result.student._id as string,
      after: { electiveId: result.elective._id, electiveName: result.elective.name, term: result.student.allocatedTerm },
    });

    res.status(200).json({ success: true, data: { student: result.student, elective: result.elective } });
  } catch (error: any) {
    const status = error.status || 500;
    res.status(status).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const getMyStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const student = await Student.findById(user.userId);
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        allocatedElectiveId: student.allocatedElectiveId,
        allocatedElectiveName: student.allocatedElectiveName,
        allocatedTerm: student.allocatedTerm,
        allocationTimestamp: student.allocationTimestamp
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const getSeatCounts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { year } = req.params;
    const { term } = req.query;
    const filter: any = { year, isActive: true };
    if (term) filter.term = term;

    const electives = await Elective.find(filter);
    const data = electives.map(e => ({
      _id: e._id,
      name: e.name,
      code: e.code,
      capacity: e.capacity,
      seatsFilled: e.seatsFilled,
      remaining: e.capacity - e.seatsFilled
    }));

    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};
