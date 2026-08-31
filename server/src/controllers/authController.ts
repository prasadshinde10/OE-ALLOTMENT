import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import Student from '../models/Student';
import User from '../models/User';
import { logAudit } from '../services/auditService';
import { sendAndStoreOtp, verifyOtp as verifyOtpService, canResendOtp } from '../services/otpService';
import { sendResetPasswordEmail } from '../config/mailer';
import { env } from '../config/env';

export const sendOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      hallTicketNumber,
      firstName,
      middleName,
      lastName,
      instituteEmail,
      mobileNumber,
      branch,
      semester,
      rollNumber,
      year,
      password,
    } = req.body;

    if (!instituteEmail || !instituteEmail.endsWith(`@${env.ALLOWED_EMAIL_DOMAIN}`)) {
      res.status(400).json({ success: false, message: `Only @${env.ALLOWED_EMAIL_DOMAIN} emails are allowed` });
      return;
    }
    if (!/^\d{12}$/.test(hallTicketNumber)) {
      res.status(400).json({ success: false, message: 'Invalid hall ticket number format (must be 12 digits)' });
      return;
    }
    if (!firstName || !lastName || !mobileNumber || !branch || !semester || !rollNumber || !year || !password) {
      res.status(400).json({ success: false, message: 'All required fields must be provided' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
      return;
    }

    let student = await Student.findOne({
      $or: [{ instituteEmail: instituteEmail.toLowerCase() }, { hallTicketNumber }],
    });

    if (student) {
      if (student.isVerified) {
        res.status(400).json({ success: false, message: 'Already registered and verified' });
        return;
      }
      student.firstName = firstName;
      student.middleName = middleName || '';
      student.lastName = lastName;
      student.mobileNumber = mobileNumber;
      student.branch = branch;
      student.semester = semester;
      student.rollNumber = rollNumber;
      student.year = year;
      student.password = password; // pre-save hook will hash it
    } else {
      student = new Student({
        hallTicketNumber,
        firstName,
        middleName: middleName || '',
        lastName,
        instituteEmail: instituteEmail.toLowerCase(),
        mobileNumber,
        branch,
        semester,
        rollNumber,
        year,
        password,
        isVerified: false,
      });
    }

    await student.save();
    await sendAndStoreOtp(student.id);

    await logAudit({
      action: 'OTP_SEND',
      actorId: student.id,
      actorRole: 'system',
      targetType: 'student',
      targetId: student.id,
      metadata: { email: instituteEmail },
    });

    res.status(200).json({
      success: true,
      message: 'OTP sent to your email',
      data: { studentId: student._id, email: student.instituteEmail },
    });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(400).json({ success: false, message: 'Email, Hall Ticket, or Mobile Number already exists' });
      return;
    }
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, studentId, otp } = req.body;
    let studentEmail = email;

    if (!studentEmail && studentId) {
      const student = await Student.findById(studentId);
      if (student) studentEmail = student.instituteEmail;
    }

    if (!studentEmail) {
      res.status(400).json({ success: false, message: 'Email or Student ID is required' });
      return;
    }

    const result = await verifyOtpService(studentEmail, otp);

    if (!result.valid || !result.student) {
      await logAudit({
        action: 'OTP_VERIFY_FAIL',
        actorId: 'system',
        actorRole: 'system',
        targetType: 'student',
        metadata: { email: studentEmail },
      });
      res.status(400).json({ success: false, message: result.message });
      return;
    }

    const { student } = result;
    const token = jwt.sign(
      {
        userId: student._id,
        role: 'student',
        year: student.year,
        email: student.instituteEmail,
        name: student.fullName,
      },
      env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    await logAudit({
      action: 'OTP_VERIFY_SUCCESS',
      actorId: student.id,
      actorRole: 'student',
      targetType: 'student',
      targetId: student.id,
      metadata: { email: studentEmail },
    });

    res.status(200).json({
      success: true,
      token,
      user: {
        userId: student._id,
        role: 'student',
        name: student.fullName,
        year: student.year,
        email: student.instituteEmail,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const resendOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, studentId } = req.body;
    let student = null;

    if (studentId) {
      student = await Student.findById(studentId);
    } else if (email) {
      student = await Student.findOne({ instituteEmail: email.toLowerCase() });
    }

    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }
    if (student.isVerified) {
      res.status(400).json({ success: false, message: 'Already verified' });
      return;
    }
    if (!canResendOtp(student)) {
      res.status(429).json({ success: false, message: 'Please wait 60 seconds before resending' });
      return;
    }

    await sendAndStoreOtp(student.id);
    await logAudit({
      action: 'OTP_RESEND',
      actorId: student.id,
      actorRole: 'system',
      targetType: 'student',
      targetId: student.id,
      metadata: { email: student.instituteEmail },
    });

    res.status(200).json({ success: true, message: 'OTP resent successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const studentLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, instituteEmail, password } = req.body;
    const loginEmail = (instituteEmail || email)?.toLowerCase();

    if (!loginEmail || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required' });
      return;
    }

    const student = await Student.findOne({ instituteEmail: loginEmail });

    if (!student) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    if (!student.isVerified) {
      res.status(403).json({
        success: false,
        message: 'Account not verified. Please complete OTP verification.',
        data: { needsVerification: true, studentId: student._id, email: student.instituteEmail },
      });
      return;
    }

    if (!student.password) {
      res.status(400).json({
        success: false,
        message: 'No password set on this account. Please use Forgot Password to create one.',
      });
      return;
    }

    const isMatch = await student.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      {
        userId: student._id,
        role: 'student',
        year: student.year,
        email: student.instituteEmail,
        name: student.fullName,
      },
      env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    await logAudit({
      action: 'STUDENT_LOGIN',
      actorId: student.id,
      actorRole: 'student',
      targetType: 'student',
      targetId: student.id,
    });

    res.status(200).json({
      success: true,
      token,
      user: {
        userId: student._id,
        name: student.fullName,
        email: student.instituteEmail,
        year: student.year,
        role: 'student',
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const adminLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required' });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role, name: user.name, email: user.email },
      env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    await logAudit({
      action: user.role === 'admin' ? 'ADMIN_LOGIN' : 'TEACHER_LOGIN',
      actorId: user.id,
      actorRole: user.role,
      targetType: 'user',
      targetId: user.id,
    });

    res.status(200).json({
      success: true,
      token,
      user: { userId: user._id, name: user.name, email: user.email, role: user.role },
      data: { userId: user._id, name: user.name, role: user.role },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const forgotPasswordStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, instituteEmail } = req.body;
    const targetEmail = (instituteEmail || email)?.toLowerCase();

    if (!targetEmail) {
      res.status(400).json({ success: false, message: 'Email is required' });
      return;
    }

    const student = await Student.findOne({ instituteEmail: targetEmail });
    if (student) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = await bcrypt.hash(resetToken, 10);

      student.resetPasswordToken = hashedToken;
      student.resetPasswordExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
      await student.save();

      const resetUrl = `${env.CLIENT_URL}/reset-password?token=${resetToken}&type=student`;
      await sendResetPasswordEmail(student.instituteEmail, resetUrl);

      await logAudit({
        action: 'PASSWORD_RESET_REQUESTED',
        actorId: student.id,
        actorRole: 'student',
        targetType: 'student',
        targetId: student.id,
      });
    }

    // Always return success to prevent user enumeration
    res.status(200).json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const resetPasswordStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      res.status(400).json({ success: false, message: 'Token and new password are required' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
      return;
    }

    const candidates = await Student.find({
      resetPasswordExpiresAt: { $gt: new Date() },
      resetPasswordToken: { $ne: null },
    });

    let matchedStudent = null;
    for (const student of candidates) {
      if (student.resetPasswordToken) {
        const isMatch = await bcrypt.compare(token, student.resetPasswordToken);
        if (isMatch) {
          matchedStudent = student;
          break;
        }
      }
    }

    if (!matchedStudent) {
      res.status(400).json({ success: false, message: 'Invalid or expired password reset token' });
      return;
    }

    matchedStudent.password = newPassword; // pre-save hook will hash it
    matchedStudent.resetPasswordToken = null;
    matchedStudent.resetPasswordExpiresAt = null;
    await matchedStudent.save();

    await logAudit({
      action: 'PASSWORD_RESET_COMPLETED',
      actorId: matchedStudent.id,
      actorRole: 'student',
      targetType: 'student',
      targetId: matchedStudent.id,
    });

    res.status(200).json({ success: true, message: 'Password reset successfully. You can now login.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const forgotPasswordAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    const targetEmail = email?.toLowerCase();

    if (!targetEmail) {
      res.status(400).json({ success: false, message: 'Email is required' });
      return;
    }

    const user = await User.findOne({ email: targetEmail });
    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = await bcrypt.hash(resetToken, 10);

      user.resetPasswordToken = hashedToken;
      user.resetPasswordExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
      await user.save();

      const resetUrl = `${env.CLIENT_URL}/reset-password?token=${resetToken}&type=admin`;
      await sendResetPasswordEmail(user.email, resetUrl);

      await logAudit({
        action: 'PASSWORD_RESET_REQUESTED',
        actorId: user.id,
        actorRole: user.role,
        targetType: 'user',
        targetId: user.id,
      });
    }

    res.status(200).json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const resetPasswordAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      res.status(400).json({ success: false, message: 'Token and new password are required' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
      return;
    }

    const candidates = await User.find({
      resetPasswordExpiresAt: { $gt: new Date() },
      resetPasswordToken: { $ne: null },
    });

    let matchedUser = null;
    for (const user of candidates) {
      if (user.resetPasswordToken) {
        const isMatch = await bcrypt.compare(token, user.resetPasswordToken);
        if (isMatch) {
          matchedUser = user;
          break;
        }
      }
    }

    if (!matchedUser) {
      res.status(400).json({ success: false, message: 'Invalid or expired password reset token' });
      return;
    }

    matchedUser.password = newPassword; // pre-save hook will hash it
    matchedUser.resetPasswordToken = null;
    matchedUser.resetPasswordExpiresAt = null;
    await matchedUser.save();

    await logAudit({
      action: 'PASSWORD_RESET_COMPLETED',
      actorId: matchedUser.id,
      actorRole: matchedUser.role,
      targetType: 'user',
      targetId: matchedUser.id,
    });

    res.status(200).json({ success: true, message: 'Password reset successfully. You can now login.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

/**
 * GET /api/auth/me — Get current student profile
 */
export const getMyProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const student = await Student.findById(req.user?.userId);
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        _id: student._id,
        firstName: student.firstName,
        middleName: student.middleName,
        lastName: student.lastName,
        fullName: student.fullName,
        instituteEmail: student.instituteEmail,
        hallTicketNumber: student.hallTicketNumber || '',
        mobileNumber: student.mobileNumber || '',
        branch: student.branch || '',
        semester: student.semester || 'Sem-5',
        rollNumber: student.rollNumber || '',
        year: student.year || 3,
        isVerified: student.isVerified,
        isProfileComplete: student.isProfileComplete,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

/**
 * POST /api/auth/complete-profile — Complete student onboarding after Microsoft SSO
 */
export const completeProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const student = await Student.findById(req.user?.userId);
    if (!student) {
      res.status(404).json({ success: false, message: 'Student account not found' });
      return;
    }

    const {
      firstName,
      middleName,
      lastName,
      hallTicketNumber,
      mobileNumber,
      branch,
      semester,
      rollNumber,
      year,
      password,
    } = req.body;

    if (!firstName || !firstName.trim()) {
      res.status(400).json({ success: false, message: 'First Name is required' });
      return;
    }

    if (!lastName || !lastName.trim()) {
      res.status(400).json({ success: false, message: 'Last Name is required' });
      return;
    }

    if (!hallTicketNumber || !mobileNumber || !branch || !semester || !rollNumber || !year) {
      res.status(400).json({ success: false, message: 'All mandatory fields must be provided' });
      return;
    }

    if (!/^\d{12}$/.test(hallTicketNumber)) {
      res.status(400).json({ success: false, message: 'Hall Ticket / PRN must be exactly 12 digits' });
      return;
    }

    if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
      res.status(400).json({ success: false, message: 'Invalid 10-digit mobile number' });
      return;
    }

    // Check for duplicate hall ticket number
    const existingHT = await Student.findOne({
      hallTicketNumber,
      _id: { $ne: student._id },
    });
    if (existingHT) {
      res.status(400).json({ success: false, message: 'This Hall Ticket / PRN is already registered by another student' });
      return;
    }

    // Check for duplicate mobile number
    const existingMobile = await Student.findOne({
      mobileNumber,
      _id: { $ne: student._id },
    });
    if (existingMobile) {
      res.status(400).json({ success: false, message: 'This mobile number is already registered by another student' });
      return;
    }

    student.firstName = firstName.trim();
    student.middleName = (middleName || '').trim();
    student.lastName = lastName.trim();
    student.hallTicketNumber = hallTicketNumber;
    student.mobileNumber = mobileNumber;
    student.branch = branch;
    student.semester = semester;
    student.rollNumber = rollNumber;
    student.year = Number(year);
    student.isProfileComplete = true;
    student.isVerified = true;

    if (password && password.length >= 6) {
      student.password = password; // pre-save hook will hash it
    }

    await student.save();

    await logAudit({
      action: 'STUDENT_PROFILE_COMPLETED',
      actorId: student.id,
      actorRole: 'student',
      targetType: 'student',
      targetId: student.id,
      metadata: { hallTicketNumber, branch, year },
    });

    const token = jwt.sign(
      {
        userId: student._id,
        role: 'student',
        year: student.year,
        email: student.instituteEmail,
        name: student.fullName,
        isProfileComplete: true,
      },
      env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(200).json({
      success: true,
      message: 'Registration finalized successfully',
      token,
      student: {
        userId: student._id,
        name: student.fullName,
        email: student.instituteEmail,
        year: student.year,
        role: 'student',
        isProfileComplete: true,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};
