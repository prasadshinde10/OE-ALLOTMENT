import { Request, Response } from 'express';
import { allocateClubSeat } from '../services/clubAllocationService';
import Club from '../models/Club';
import Student from '../models/Student';
import TermConfig from '../models/TermConfig';
import { logAudit } from '../services/auditService';

export const allocateClub = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { clubId } = req.body;

    if (!clubId) {
      res.status(400).json({ success: false, message: 'clubId is required' });
      return;
    }

    const result = await allocateClubSeat(user.userId, clubId);

    const io = req.app.get('io');
    if (io) {
      io.to('club-year-1').emit('club-seat-changed', {
        clubId: result.club._id,
        category: result.category,
        seatsFilled: result.club.seatsFilled,
        capacity: result.club.capacity,
        remaining: result.club.capacity - result.club.seatsFilled,
      });
    }

    await logAudit({
      action: 'ALLOCATE_CLUB_SEAT',
      actorId: user.userId,
      actorRole: 'student',
      targetType: 'student',
      targetId: String(result.student._id),
      after: {
        clubId: result.club._id,
        clubName: result.club.name,
        category: result.category,
        term: result.club.term,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        student: result.student,
        club: result.club,
        category: result.category,
      },
    });
  } catch (error: any) {
    const status = error.status || 500;
    res.status(status).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const getMyClubStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const student = await Student.findById(user.userId);
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }

    // Resolving coordinator phone numbers if not directly on student
    let coCurricularContact = student.allocatedCoCurricularContact || '';
    if (!coCurricularContact && student.allocatedCoCurricularClubId && student.allocatedCoCurricularDivision) {
      try {
        const club = await Club.findById(student.allocatedCoCurricularClubId).lean();
        const div = club?.divisions?.find((d) => d.divisionName === student.allocatedCoCurricularDivision);
        if (div?.coordinatorContact || div?.facultyContact) {
          coCurricularContact = div.coordinatorContact || div.facultyContact || '';
        }
      } catch (e) {
        // ignore lookup error
      }
    }

    let extraCurricularContact = student.allocatedExtraCurricularContact || '';
    if (!extraCurricularContact && student.allocatedExtraCurricularClubId && student.allocatedExtraCurricularDivision) {
      try {
        const club = await Club.findById(student.allocatedExtraCurricularClubId).lean();
        const div = club?.divisions?.find((d) => d.divisionName === student.allocatedExtraCurricularDivision);
        if (div?.coordinatorContact || div?.facultyContact) {
          extraCurricularContact = div.coordinatorContact || div.facultyContact || '';
        }
      } catch (e) {
        // ignore lookup error
      }
    }

    res.status(200).json({
      success: true,
      data: {
        studentId: student._id,
        name: student.fullName,
        year: student.year,
        branch: student.branch,
        rollNumber: student.rollNumber,
        hallTicketNumber: student.hallTicketNumber,
        coCurricular: {
          clubId: student.allocatedCoCurricularClubId || null,
          clubName: student.allocatedCoCurricularClubName || null,
          term: student.allocatedCoCurricularClubTerm || null,
          timestamp: student.allocatedCoCurricularTimestamp || null,
          division: student.allocatedCoCurricularDivision || null,
          coordinator: student.allocatedCoCurricularCoordinator || null,
          contact: coCurricularContact || 'N/A',
          hall: student.allocatedCoCurricularHall || 'N/A',
        },
        extraCurricular: {
          clubId: student.allocatedExtraCurricularClubId || null,
          clubName: student.allocatedExtraCurricularClubName || null,
          term: student.allocatedExtraCurricularClubTerm || null,
          timestamp: student.allocatedExtraCurricularTimestamp || null,
          division: student.allocatedExtraCurricularDivision || null,
          coordinator: student.allocatedExtraCurricularCoordinator || null,
          contact: extraCurricularContact || 'N/A',
          hall: student.allocatedExtraCurricularHall || 'N/A',
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const getClubSeatCounts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { term, category } = req.query;
    const filter: any = { year: 1, isActive: true };
    if (term) filter.term = term;
    if (category) filter.category = category;

    const clubs = await Club.find(filter).lean();
    const data = clubs.map((c: any) => ({
      _id: c._id,
      name: c.name,
      code: c.code,
      category: c.category,
      offeredByDepartment: c.offeredByDepartment || '',
      capacity: c.capacity,
      seatsFilled: c.seatsFilled,
      remaining: c.capacity - c.seatsFilled,
      coordinatorName: c.coordinatorName || '',
      coordinatorContact: c.coordinatorContact || '',
      syllabusUrl: c.syllabusUrl || '',
      description: c.description || '',
    }));

    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const getMyClubTermConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const config = await TermConfig.findOne({ year: 1, isActive: true }).sort({
      registrationClosesAt: -1,
    });
    res.status(200).json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};
