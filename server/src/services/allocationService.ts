import mongoose from 'mongoose';
import Student from '../models/Student';
import Elective from '../models/Elective';
import TermConfig from '../models/TermConfig';
import AuditLog from '../models/AuditLog';

export const allocateSeat = async (studentId: string, electiveId: string) => {
  const student = await Student.findById(studentId);
  if (!student) throw new Error('Student not found');
  if (!student.isVerified) throw new Error('Student is not verified');
  
  const termConfig = await TermConfig.findOne({ year: student.year, isActive: true });
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
    { new: true }
  );
  
  if (!elective) {
    const err = new Error('This elective is now full or unavailable');
    (err as any).status = 409;
    throw err;
  }
  
  student.allocatedElectiveId = elective._id as mongoose.Types.ObjectId;
  student.allocatedElectiveName = elective.name;
  student.allocatedTerm = termConfig.term;
  student.allocationTimestamp = new Date();
  
  await student.save();
  
  return { student, elective };
};

export const transferSeat = async (studentId: string, newElectiveId: string, adminId: string) => {
  const session = await mongoose.startSession();
  let result: { student: any; newElective: any; oldElectiveId: any } | undefined;
  
  try {
    await session.withTransaction(async () => {
      const student = await Student.findById(studentId).session(session);
      if (!student) throw new Error('Student not found');
      
      const oldElectiveId = student.allocatedElectiveId;
      
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
      
      student.allocatedElectiveId = newElective._id as mongoose.Types.ObjectId;
      student.allocatedElectiveName = newElective.name;
      student.allocatedTerm = newElective.term;
      student.allocationTimestamp = new Date();
      await student.save({ session });
      
      await AuditLog.create([{
        action: 'REASSIGN_SEAT',
        actorId: adminId,
        actorRole: 'admin',
        targetType: 'student',
        targetId: student._id,
        before: { electiveId: oldElectiveId },
        after: { electiveId: newElective._id }
      }], { session });
      
      result = { student, newElective, oldElectiveId };
    });
  } finally {
    session.endSession();
  }
  
  return result;
};
