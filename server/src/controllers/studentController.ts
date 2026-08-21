import { Request, Response } from 'express';
import Student from '../models/Student';
import Elective from '../models/Elective';
import { logAudit } from '../services/auditService';
import { transferSeat } from '../services/allocationService';

export const getStudents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { year, class: sClass, term, elective, search, page = 1, limit = 10 } = req.query;
    const filter: any = {};
    if (year) filter.year = year;
    if (sClass) filter.class = sClass;
    if (term) filter.allocatedTerm = term;
    if (elective) filter.allocatedElectiveId = elective;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { hallTicketNumber: { $regex: search, $options: 'i' } },
        { instituteEmail: { $regex: search, $options: 'i' } }
      ];
    }

    const students = await Student.find(filter)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));
    const total = await Student.countDocuments(filter);

    res.status(200).json({ success: true, data: students, total, page: Number(page), limit: Number(limit) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const getStudentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }
    let electiveDetails = null;
    if (student.allocatedElectiveId) {
      electiveDetails = await Elective.findById(student.allocatedElectiveId);
    }
    res.status(200).json({ success: true, data: { student, electiveDetails } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const updateStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const oldStudent = await Student.findById(req.params.id);
    if (!oldStudent) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }
    const updated = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });

    await logAudit({
      action: 'STUDENT_EDIT',
      actorId: (req as any).user.userId,
      actorRole: 'admin',
      targetType: 'student',
      targetId: req.params.id,
      before: oldStudent,
      after: updated
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(400).json({ success: false, message: 'Duplicate field value (email, phone, or hall ticket)' });
      return;
    }
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const reassignElective = async (req: Request, res: Response): Promise<void> => {
  try {
    const { newElectiveId } = req.body;
    const adminId = (req as any).user.userId;
    const studentId = req.params.id;

    const result = await transferSeat(studentId, newElectiveId, adminId);
    if (!result) throw new Error('Transfer failed');

    const io = req.app.get('io');
    if (io) {
      io.to(`year-${result.student.year}`).emit('seat-changed', {
        electiveId: result.newElective._id,
        seatsFilled: result.newElective.seatsFilled,
        capacity: result.newElective.capacity
      });
      if (result.oldElectiveId) {
        const oldE = await Elective.findById(result.oldElectiveId);
        if (oldE) {
          io.to(`year-${result.student.year}`).emit('seat-changed', {
            electiveId: oldE._id,
            seatsFilled: oldE.seatsFilled,
            capacity: oldE.capacity
          });
        }
      }
    }

    res.status(200).json({ success: true, data: result.student });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const deleteStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }
    if (student.allocatedElectiveId) {
      await Elective.findByIdAndUpdate(student.allocatedElectiveId, { $inc: { seatsFilled: -1 } });
    }
    await Student.findByIdAndDelete(req.params.id);
    await logAudit({ action: 'STUDENT_DELETE', actorId: (req as any).user.userId, actorRole: 'admin', targetType: 'student', targetId: req.params.id });

    res.status(200).json({ success: true, message: 'Student deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};
