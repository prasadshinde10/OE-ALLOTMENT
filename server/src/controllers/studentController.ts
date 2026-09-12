import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Student from '../models/Student';
import Elective from '../models/Elective';
import Club from '../models/Club';
import TestSubmission from '../models/TestSubmission';
import { logAudit } from '../services/auditService';
import { transferSeat } from '../services/allocationService';
import { broadcastSeatUpdate, broadcastClubSeatUpdate } from '../socket';
import { resetAllocationEngine } from '../services/allocationEngine';

export const getStudents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { year, branch, class: sClass, term, elective, search, page = 1, limit = 10 } = req.query;
    const filter: any = {};
    if (year) filter.year = Number(year);
    if (branch || sClass) filter.branch = branch || sClass;
    if (term) filter.allocatedTerm = term;
    if (elective) filter.allocatedElectiveId = elective;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { hallTicketNumber: { $regex: search, $options: 'i' } },
        { instituteEmail: { $regex: search, $options: 'i' } },
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

    const updates = { ...req.body };
    delete updates.password;
    delete updates.resetPasswordToken;
    delete updates.resetPasswordExpiresAt;
    delete updates.otpHash;
    delete updates.otpExpiresAt;
    delete updates.otpAttempts;
    delete updates.lastOtpSentAt;

    const updated = await Student.findByIdAndUpdate(req.params.id, updates, { new: true });

    await logAudit({
      action: 'STUDENT_EDIT',
      actorId: (req as any).user.userId,
      actorRole: 'admin',
      targetType: 'student',
      targetId: req.params.id,
      before: oldStudent,
      after: updated,
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
        capacity: result.newElective.capacity,
      });
      if (result.oldElectiveId) {
        const oldE = await Elective.findById(result.oldElectiveId);
        if (oldE) {
          io.to(`year-${result.student.year}`).emit('seat-changed', {
            electiveId: oldE._id,
            seatsFilled: oldE.seatsFilled,
            capacity: oldE.capacity,
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
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, message: 'Student ID or PRN is required' });
      return;
    }

    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const student = isObjectId
      ? await Student.findById(id)
      : await Student.findOne({ hallTicketNumber: id });

    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }

    // 1. Purge Elective allotment (upper-year)
    if (student.allocatedElectiveId) {
      const elective = await Elective.findByIdAndUpdate(
        student.allocatedElectiveId,
        { $inc: { seatsFilled: -1 } },
        { new: true }
      );
      if (elective) {
        if (elective.seatsFilled < 0) {
          elective.seatsFilled = 0;
          await elective.save();
        }
        broadcastSeatUpdate(student.year || 3, {
          electiveId: elective._id,
          seatsFilled: elective.seatsFilled,
          capacity: elective.capacity,
        });
      }
    }

    // 2. Purge Co-Curricular Club allotment (FY)
    if (student.allocatedCoCurricularClubId) {
      const ccClub = await Club.findByIdAndUpdate(
        student.allocatedCoCurricularClubId,
        { $inc: { seatsFilled: -1 } },
        { new: true }
      );
      if (ccClub) {
        if (ccClub.seatsFilled < 0) {
          ccClub.seatsFilled = 0;
          await ccClub.save();
        }
        broadcastClubSeatUpdate({
          clubId: ccClub._id.toString(),
          seatsFilled: ccClub.seatsFilled,
          capacity: ccClub.capacity,
          remaining: Math.max(0, ccClub.capacity - ccClub.seatsFilled),
        });
      }
    }

    // 3. Purge Extra-Curricular Club allotment (FY)
    if (student.allocatedExtraCurricularClubId) {
      const ecClub = await Club.findByIdAndUpdate(
        student.allocatedExtraCurricularClubId,
        { $inc: { seatsFilled: -1 } },
        { new: true }
      );
      if (ecClub) {
        if (ecClub.seatsFilled < 0) {
          ecClub.seatsFilled = 0;
          await ecClub.save();
        }
        broadcastClubSeatUpdate({
          clubId: ecClub._id.toString(),
          seatsFilled: ecClub.seatsFilled,
          capacity: ecClub.capacity,
          remaining: Math.max(0, ecClub.capacity - ecClub.seatsFilled),
        });
      }
    }

    // 4. Purge test submissions if any
    try {
      await TestSubmission.deleteMany({ studentId: String(student._id) });
    } catch (e) {
      // ignore
    }

    // 5. Delete student record
    await Student.findByIdAndDelete(student._id);

    // 6. Log audit
    await logAudit({
      action: 'STUDENT_DELETE',
      actorId: (req as any).user?.userId || 'admin',
      actorRole: (req as any).user?.role || 'admin',
      targetType: 'student',
      targetId: String(student._id),
      metadata: {
        studentName: student.fullName,
        email: student.instituteEmail,
        hallTicketNumber: student.hallTicketNumber,
        branch: student.branch,
        year: student.year,
      },
    });

    res.status(200).json({
      success: true,
      message: `Student "${student.fullName}" deleted successfully and all allotments purged.`,
      data: { id: student._id },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

/**
 * DELETE /api/admin/students/delete-all — Bulk purge all First-Year students
 * Strictly restricted to FY Admin / Super Admin
 * Hardcoded query filtering protects upper-year (year 2 & 3) records.
 */
export const deleteAllFYStudents = async (req: Request, res: Response): Promise<void> => {
  try {
    // Hardcoded query filter to purge ONLY records where year === 1 or currentYear === 'FE', protecting upper-year records
    const fyFilter: any = {
      $and: [
        { year: { $nin: [2, 3] } },
        {
          $or: [
            { year: 1 },
            { currentYear: 'FE' },
          ],
        },
      ],
    };

    const countToDelete = await Student.countDocuments(fyFilter);
    if (countToDelete === 0) {
      res.status(200).json({
        success: true,
        message: 'No First-Year students found to delete.',
        deletedCount: 0,
      });
      return;
    }

    // Find all FY student IDs to clean up associated TestSubmissions
    const fyStudents = await Student.find(fyFilter, '_id').lean();
    const fyStudentIds = fyStudents.map((s) => String(s._id));

    if (fyStudentIds.length > 0) {
      try {
        await TestSubmission.deleteMany({ studentId: { $in: fyStudentIds } });
      } catch (e) {
        // ignore
      }
    }

    // Reset seats filled on all First-Year clubs to 0
    await Club.updateMany({ year: 1 }, { $set: { seatsFilled: 0 } });

    // Broadcast reset club seat updates
    const fyClubs = await Club.find({ year: 1 });
    for (const club of fyClubs) {
      broadcastClubSeatUpdate({
        clubId: club._id.toString(),
        seatsFilled: 0,
        capacity: club.capacity,
        remaining: club.capacity,
      });
    }

    // Re-sync in-memory allocation engine so new allocations see the zeroed state
    await resetAllocationEngine();

    // Execute hardcoded bulk delete strictly on FY students
    const deleteResult = await Student.deleteMany(fyFilter);

    // Audit log
    await logAudit({
      action: 'FY_STUDENTS_BULK_DELETE',
      actorId: (req as any).user?.userId || 'admin',
      actorRole: (req as any).user?.role || 'admin',
      targetType: 'student',
      metadata: {
        deletedCount: deleteResult.deletedCount,
      },
    });

    res.status(200).json({
      success: true,
      message: `Successfully purged ${deleteResult.deletedCount} First-Year students and reset all club allotments.`,
      deletedCount: deleteResult.deletedCount,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};
