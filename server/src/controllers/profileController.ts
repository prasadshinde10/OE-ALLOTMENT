import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import Student from '../models/Student';
import { env } from '../config/env';
import { logAudit } from '../services/auditService';

export const updateMyProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const student = await Student.findById(userId);
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }

    const {
      firstName,
      middleName,
      lastName,
      mobileNumber,
      branch,
      semester,
      rollNumber,
      year,
    } = req.body;

    // Validate names
    if (firstName !== undefined && !firstName.trim()) {
      res.status(400).json({ success: false, message: 'First name cannot be empty' });
      return;
    }
    if (lastName !== undefined && !lastName.trim()) {
      res.status(400).json({ success: false, message: 'Last name cannot be empty' });
      return;
    }

    // Validate mobile number
    const newMobile = mobileNumber !== undefined ? mobileNumber.trim() : student.mobileNumber;
    if (newMobile && !/^[6-9]\d{9}$/.test(newMobile)) {
      res.status(400).json({
        success: false,
        message: 'Invalid mobile number. Must be a 10-digit Indian phone number starting with 6-9.',
      });
      return;
    }

    // Check duplicate mobile number
    if (newMobile && newMobile !== student.mobileNumber) {
      const existingMobile = await Student.findOne({
        mobileNumber: newMobile,
        _id: { $ne: student._id },
      });
      if (existingMobile) {
        res.status(409).json({
          success: false,
          message: 'This mobile number is already registered by another student',
        });
        return;
      }
    }

    // Target Branch & Semester & Roll Number for uniqueness validation
    const targetBranch = branch !== undefined ? branch.trim() : student.branch;
    const targetSemester = semester !== undefined ? semester.trim() : student.semester;
    const targetRoll = rollNumber !== undefined ? rollNumber.trim() : student.rollNumber;

    if (targetRoll && (targetRoll !== student.rollNumber || targetBranch !== student.branch || targetSemester !== student.semester)) {
      const duplicateRoll = await Student.findOne({
        _id: { $ne: student._id },
        branch: targetBranch,
        semester: targetSemester,
        rollNumber: targetRoll,
      });

      if (duplicateRoll) {
        res.status(409).json({
          success: false,
          message: `Roll Number "${targetRoll}" is already taken in ${targetBranch} (${targetSemester}). Duplicate roll numbers are not allowed within the same department and class.`,
        });
        return;
      }
    }

    const beforeState = {
      firstName: student.firstName,
      middleName: student.middleName,
      lastName: student.lastName,
      mobileNumber: student.mobileNumber,
      branch: student.branch,
      semester: student.semester,
      rollNumber: student.rollNumber,
      year: student.year,
    };

    if (firstName !== undefined) student.firstName = firstName.trim();
    if (middleName !== undefined) student.middleName = (middleName || '').trim();
    if (lastName !== undefined) student.lastName = lastName.trim();
    if (mobileNumber !== undefined) student.mobileNumber = newMobile;
    if (branch !== undefined) student.branch = targetBranch;
    if (semester !== undefined) student.semester = targetSemester;
    if (rollNumber !== undefined) student.rollNumber = targetRoll;
    if (year !== undefined) student.year = Number(year);

    await student.save();

    await logAudit({
      action: 'STUDENT_PROFILE_UPDATE',
      actorId: String(student._id),
      actorRole: 'student',
      targetType: 'student',
      targetId: String(student._id),
      before: beforeState,
      after: {
        firstName: student.firstName,
        middleName: student.middleName,
        lastName: student.lastName,
        mobileNumber: student.mobileNumber,
        branch: student.branch,
        semester: student.semester,
        rollNumber: student.rollNumber,
        year: student.year,
      },
    });

    // Generate refreshed JWT token with updated name/year
    const token = jwt.sign(
      {
        userId: student._id,
        role: 'student',
        year: student.year,
        email: student.instituteEmail,
        name: student.fullName,
        isProfileComplete: student.isProfileComplete,
      },
      env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      token,
      data: {
        _id: student._id,
        firstName: student.firstName,
        middleName: student.middleName,
        lastName: student.lastName,
        fullName: student.fullName,
        instituteEmail: student.instituteEmail,
        hallTicketNumber: student.hallTicketNumber,
        mobileNumber: student.mobileNumber,
        branch: student.branch,
        semester: student.semester,
        rollNumber: student.rollNumber,
        year: student.year,
        isVerified: student.isVerified,
        isProfileComplete: student.isProfileComplete,
      },
    });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({
        success: false,
        message: 'A duplicate field value conflict occurred (mobile number or hall ticket).',
      });
      return;
    }
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};
