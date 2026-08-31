import mongoose from 'mongoose';
import Student from '../models/Student';
import Elective from '../models/Elective';
import TermConfig from '../models/TermConfig';
import AuditLog from '../models/AuditLog';

export const allocateSeat = async (studentId: string, electiveId: string) => {
  const student = await Student.findById(studentId).lean();
  if (!student) throw new Error('Student not found');
  if (!student.isVerified) throw new Error('Student is not verified');
  
  const termConfig = await TermConfig.findOne({ year: student.year, isActive: true }).lean();
  if (!termConfig) throw new Error('No active term found for your year');
  
  const now = new Date();
  if (now < termConfig.registrationOpensAt || now > termConfig.registrationClosesAt) {
    throw new Error('Registration window is not open');
  }
  
  if (student.allocatedElectiveId && student.allocatedTerm === termConfig.term) {
    throw new Error('Already allocated an elective for this term');
  }
  
  const elective = await Elective.findOneAndUpdate(
    { 
      _id: electiveId, 
      year: student.year, 
      term: termConfig.term, 
      isActive: true, 
      $expr: { $lt: ['$seatsFilled', '$capacity'] } 
    },
    { $inc: { seatsFilled: 1 } },
    { new: true, lean: true }
  );
  
  if (!elective) {
    const err = new Error('This elective is full. No seats are currently available.');
    (err as any).status = 409;
    throw err;
  }
  
  const updatedStudent = await Student.findByIdAndUpdate(
    studentId,
    {
      $set: {
        allocatedElectiveId: elective._id as mongoose.Types.ObjectId,
        allocatedElectiveName: elective.name,
        allocatedTerm: termConfig.term,
        allocationTimestamp: new Date(),
      },
    },
    { new: true, lean: true }
  );

  if (!updatedStudent) {
    throw new Error('Failed to update student allocation record');
  }
  
  return { student: updatedStudent, elective };
};

export const transferSeat = async (studentId: string, newElectiveId: string, adminId: string) => {
  const student = await Student.findById(studentId);
  if (!student) throw new Error('Student not found');
  
  const oldElectiveId = student.allocatedElectiveId;
  if (oldElectiveId && String(oldElectiveId) === String(newElectiveId)) {
    throw new Error('Student is already allocated to this elective');
  }

  // Try with transaction first (if replica set is active)
  try {
    const session = await mongoose.startSession();
    let result: { student: any; newElective: any; oldElectiveId: any } | undefined;
    try {
      await session.withTransaction(async () => {
        const studentDoc = await Student.findById(studentId).session(session);
        if (!studentDoc) throw new Error('Student not found');
        
        if (oldElectiveId) {
          await Elective.findOneAndUpdate(
            { _id: oldElectiveId, seatsFilled: { $gt: 0 } },
            { $inc: { seatsFilled: -1 } },
            { session }
          );
        }
        
        const newElective = await Elective.findOneAndUpdate(
          { _id: newElectiveId, $expr: { $lt: ['$seatsFilled', '$capacity'] }, isActive: true },
          { $inc: { seatsFilled: 1 } },
          { session, new: true }
        );
        
        if (!newElective) {
          throw new Error('Target elective is full or unavailable');
        }
        
        studentDoc.allocatedElectiveId = newElective._id as mongoose.Types.ObjectId;
        studentDoc.allocatedElectiveName = newElective.name;
        studentDoc.allocatedTerm = newElective.term;
        studentDoc.allocationTimestamp = new Date();
        await studentDoc.save({ session });
        
        await AuditLog.create([{
          action: 'REASSIGN_SEAT',
          actorId: adminId,
          actorRole: 'admin',
          targetType: 'student',
          targetId: studentDoc._id,
          before: { electiveId: oldElectiveId },
          after: { electiveId: newElective._id }
        }], { session });
        
        result = { student: studentDoc, newElective, oldElectiveId };
      });
      return result;
    } finally {
      session.endSession();
    }
  } catch (err: any) {
    // If transactions are not supported on this MongoDB instance, fall back to atomic sequence
    if (err.message && (err.message.includes('Transaction') || err.message.includes('replica set') || err.code === 20)) {
      const newElective = await Elective.findOneAndUpdate(
        { _id: newElectiveId, $expr: { $lt: ['$seatsFilled', '$capacity'] }, isActive: true },
        { $inc: { seatsFilled: 1 } },
        { new: true }
      );
      
      if (!newElective) {
        throw new Error('Target elective is full or unavailable');
      }

      if (oldElectiveId) {
        await Elective.findOneAndUpdate(
          { _id: oldElectiveId, seatsFilled: { $gt: 0 } },
          { $inc: { seatsFilled: -1 } }
        );
      }

      student.allocatedElectiveId = newElective._id as mongoose.Types.ObjectId;
      student.allocatedElectiveName = newElective.name;
      student.allocatedTerm = newElective.term;
      student.allocationTimestamp = new Date();
      await student.save();

      await AuditLog.create({
        action: 'REASSIGN_SEAT',
        actorId: adminId,
        actorRole: 'admin',
        targetType: 'student',
        targetId: student._id,
        before: { electiveId: oldElectiveId },
        after: { electiveId: newElective._id }
      });

      return { student, newElective, oldElectiveId };
    }
    throw err;
  }
};
