import mongoose from 'mongoose';
import Student from '../models/Student';
import Club from '../models/Club';
import TermConfig from '../models/TermConfig';
import AuditLog from '../models/AuditLog';
import { isBranchEligible } from '../utils/branchMatcher';

export const allocateClubSeat = async (studentId: string, clubId: string) => {
  const student = await Student.findById(studentId).lean();
  if (!student) throw new Error('Student not found');
  if (!student.isVerified) throw new Error('Student is not verified');
  if (student.year !== 1) throw new Error('Club allocations are exclusively for First-Year students');

  const termConfig = await TermConfig.findOne({ year: 1, isActive: true }).lean();
  if (!termConfig) throw new Error('No active term configuration found for First-Year clubs');

  const now = new Date();
  if (now < termConfig.registrationOpensAt || now > termConfig.registrationClosesAt) {
    throw new Error('Club registration window is not open');
  }

  const targetClub = await Club.findById(clubId).lean();
  if (!targetClub || !targetClub.isActive) {
    throw new Error('Club not found or inactive');
  }

  // Enforce target branch restrictions for co-curricular clubs
  if (targetClub.category === 'co-curricular') {
    const clubTargetBranches = (targetClub as any).targetBranches || [];
    if (clubTargetBranches.length > 0 && !isBranchEligible(student.branch, clubTargetBranches)) {
      throw new Error('Your branch is not eligible for this co-curricular club. Please select a club that matches your program.');
    }
  }

  const category = targetClub.category;

  if (category === 'co-curricular') {
    if (student.allocatedCoCurricularClubId && student.allocatedCoCurricularClubTerm === termConfig.term) {
      throw new Error('You have already been allocated a Co-Curricular club for this term');
    }
  } else if (category === 'extra-curricular') {
    if (student.allocatedExtraCurricularClubId && student.allocatedExtraCurricularClubTerm === termConfig.term) {
      throw new Error('You have already been allocated an Extra-Curricular club for this term');
    }
  }

  // Atomic FCFS seat grab with MongoDB concurrency check
  const updatedClub = await Club.findOneAndUpdate(
    {
      _id: clubId,
      year: 1,
      term: termConfig.term,
      isActive: true,
      $expr: { $lt: ['$seatsFilled', '$capacity'] },
    },
    { $inc: { seatsFilled: 1 } },
    { new: true, lean: true }
  );

  if (!updatedClub) {
    const err = new Error('This club is currently full. No seats are available.');
    (err as any).status = 409;
    throw err;
  }

  const updateFields: any = {};
  if (category === 'co-curricular') {
    updateFields.allocatedCoCurricularClubId = updatedClub._id as mongoose.Types.ObjectId;
    updateFields.allocatedCoCurricularClubName = updatedClub.name;
    updateFields.allocatedCoCurricularClubTerm = termConfig.term;
    updateFields.allocatedCoCurricularTimestamp = new Date();
  } else {
    updateFields.allocatedExtraCurricularClubId = updatedClub._id as mongoose.Types.ObjectId;
    updateFields.allocatedExtraCurricularClubName = updatedClub.name;
    updateFields.allocatedExtraCurricularClubTerm = termConfig.term;
    updateFields.allocatedExtraCurricularTimestamp = new Date();
  }

  const updatedStudent = await Student.findByIdAndUpdate(
    studentId,
    { $set: updateFields },
    { new: true, lean: true }
  );

  if (!updatedStudent) {
    // Rollback seat count increment if student update fails
    await Club.findByIdAndUpdate(clubId, { $inc: { seatsFilled: -1 } });
    throw new Error('Failed to update student club allocation record');
  }

  return { student: updatedStudent, club: updatedClub, category };
};

export const transferClubSeat = async (studentId: string, newClubId: string, adminId: string) => {
  const student = await Student.findById(studentId);
  if (!student) throw new Error('Student not found');

  const newClub = await Club.findById(newClubId);
  if (!newClub || !newClub.isActive) throw new Error('Target club not found or inactive');

  const category = newClub.category;
  const isCoCurricular = category === 'co-curricular';
  const oldClubId = isCoCurricular
    ? student.allocatedCoCurricularClubId
    : student.allocatedExtraCurricularClubId;

  if (oldClubId && String(oldClubId) === String(newClubId)) {
    throw new Error('Student is already allocated to this club');
  }

  // Validate branch eligibility for co-curricular clubs
  if (isCoCurricular) {
    const clubTargetBranches = (newClub as any).targetBranches || [];
    if (clubTargetBranches.length > 0 && !isBranchEligible(student.branch, clubTargetBranches)) {
      throw new Error(`Student's branch (${student.branch}) is not eligible for this co-curricular club (${newClub.name}). Target branches: ${clubTargetBranches.join(', ')}`);
    }
  }

  // Attempt transaction
  try {
    const session = await mongoose.startSession();
    let result: any;
    try {
      await session.withTransaction(async () => {
        const studentDoc = await Student.findById(studentId).session(session);
        if (!studentDoc) throw new Error('Student not found');

        if (oldClubId) {
          await Club.findOneAndUpdate(
            { _id: oldClubId, seatsFilled: { $gt: 0 } },
            { $inc: { seatsFilled: -1 } },
            { session }
          );
        }

        const allocatedNewClub = await Club.findOneAndUpdate(
          { _id: newClubId, $expr: { $lt: ['$seatsFilled', '$capacity'] }, isActive: true },
          { $inc: { seatsFilled: 1 } },
          { session, new: true }
        );

        if (!allocatedNewClub) {
          throw new Error('Target club is full or unavailable');
        }

        if (isCoCurricular) {
          studentDoc.allocatedCoCurricularClubId = allocatedNewClub._id as mongoose.Types.ObjectId;
          studentDoc.allocatedCoCurricularClubName = allocatedNewClub.name;
          studentDoc.allocatedCoCurricularClubTerm = allocatedNewClub.term;
          studentDoc.allocatedCoCurricularTimestamp = new Date();
        } else {
          studentDoc.allocatedExtraCurricularClubId = allocatedNewClub._id as mongoose.Types.ObjectId;
          studentDoc.allocatedExtraCurricularClubName = allocatedNewClub.name;
          studentDoc.allocatedExtraCurricularClubTerm = allocatedNewClub.term;
          studentDoc.allocatedExtraCurricularTimestamp = new Date();
        }

        await studentDoc.save({ session });

        await AuditLog.create(
          [
            {
              action: 'REASSIGN_CLUB_SEAT',
              actorId: adminId,
              actorRole: 'first_year_admin',
              targetType: 'student',
              targetId: studentDoc._id,
              before: { clubId: oldClubId, category },
              after: { clubId: allocatedNewClub._id, category },
            },
          ],
          { session }
        );

        result = { student: studentDoc, newClub: allocatedNewClub, oldClubId, category };
      });
      return result;
    } finally {
      session.endSession();
    }
  } catch (err: any) {
    // Non-replica set fallback
    if (
      err.message &&
      (err.message.includes('Transaction') ||
        err.message.includes('replica set') ||
        err.code === 20)
    ) {
      const allocatedNewClub = await Club.findOneAndUpdate(
        { _id: newClubId, $expr: { $lt: ['$seatsFilled', '$capacity'] }, isActive: true },
        { $inc: { seatsFilled: 1 } },
        { new: true }
      );

      if (!allocatedNewClub) {
        throw new Error('Target club is full or unavailable');
      }

      if (oldClubId) {
        await Club.findOneAndUpdate(
          { _id: oldClubId, seatsFilled: { $gt: 0 } },
          { $inc: { seatsFilled: -1 } }
        );
      }

      if (isCoCurricular) {
        student.allocatedCoCurricularClubId = allocatedNewClub._id as mongoose.Types.ObjectId;
        student.allocatedCoCurricularClubName = allocatedNewClub.name;
        student.allocatedCoCurricularClubTerm = allocatedNewClub.term;
        student.allocatedCoCurricularTimestamp = new Date();
      } else {
        student.allocatedExtraCurricularClubId = allocatedNewClub._id as mongoose.Types.ObjectId;
        student.allocatedExtraCurricularClubName = allocatedNewClub.name;
        student.allocatedExtraCurricularClubTerm = allocatedNewClub.term;
        student.allocatedExtraCurricularTimestamp = new Date();
      }

      await student.save();

      await AuditLog.create({
        action: 'REASSIGN_CLUB_SEAT',
        actorId: adminId,
        actorRole: 'first_year_admin',
        targetType: 'student',
        targetId: student._id,
        before: { clubId: oldClubId, category },
        after: { clubId: allocatedNewClub._id, category },
      });

      return { student, newClub: allocatedNewClub, oldClubId, category };
    }
    throw err;
  }
};
