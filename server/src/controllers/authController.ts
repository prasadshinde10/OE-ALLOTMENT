import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import Student from '../models/Student';
import User from '../models/User';
import { logAudit } from '../services/auditService';
import { sendAndStoreOtp, verifyOtp as verifyOtpService, canResendOtp } from '../services/otpService';
import { env } from '../config/env';

export const sendOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { hallTicketNumber, name, instituteEmail, mobileNumber, class: studentClass, rollNumber, year } = req.body;
    
    if (!instituteEmail.endsWith('@mit.asia')) {
      res.status(400).json({ success: false, message: 'Only @mit.asia emails are allowed' });
      return;
    }
    if (!/^\d{12}$/.test(hallTicketNumber)) {
      res.status(400).json({ success: false, message: 'Invalid hall ticket number format (must be 12 digits)' });
      return;
    }
    if (!name || !mobileNumber || !studentClass || !rollNumber || !year) {
      res.status(400).json({ success: false, message: 'All fields are required' });
      return;
    }

    let student = await Student.findOne({ $or: [{ instituteEmail }, { hallTicketNumber }] });
    
    if (student) {
      if (student.isVerified) {
        res.status(400).json({ success: false, message: 'Already registered and verified' });
        return;
      }
      student.name = name;
      student.mobileNumber = mobileNumber;
      student.class = studentClass;
      student.rollNumber = rollNumber;
      student.year = year;
    } else {
      student = new Student({
        hallTicketNumber, name, instituteEmail, mobileNumber, class: studentClass, rollNumber, year, isVerified: false
      });
    }

    await student.save();
    await sendAndStoreOtp(student.id);

    await logAudit({ action: 'OTP_SEND', actorId: student.id, actorRole: 'system', targetType: 'student', targetId: student.id, metadata: { email: instituteEmail } });
    res.status(200).json({ success: true, message: 'OTP sent to your email' });
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
    const { email, otp } = req.body;
    const result = await verifyOtpService(email, otp);
    
    if (!result.valid || !result.student) {
      await logAudit({ action: 'OTP_VERIFY_FAIL', actorId: 'system', actorRole: 'system', targetType: 'student', metadata: { email } });
      res.status(400).json({ success: false, message: result.message });
      return;
    }

    const { student } = result;
    const token = jwt.sign(
      { userId: student._id, role: 'student', year: student.year, email: student.instituteEmail, name: student.name },
      env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    await logAudit({ action: 'OTP_VERIFY_SUCCESS', actorId: student.id, actorRole: 'student', targetType: 'student', targetId: student.id, metadata: { email } });
    res.status(200).json({ success: true, token, student });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const resendOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    const student = await Student.findOne({ instituteEmail: email });
    
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
    await logAudit({ action: 'OTP_RESEND', actorId: student.id, actorRole: 'system', targetType: 'student', targetId: student.id, metadata: { email } });
    res.status(200).json({ success: true, message: 'OTP resent successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const studentLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, hallTicketNumber } = req.body;
    const student = await Student.findOne({ instituteEmail: email, hallTicketNumber });
    
    if (!student) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }
    if (!student.isVerified) {
      res.status(401).json({ success: false, message: 'Account not verified. Please verify OTP.' });
      return;
    }

    const token = jwt.sign(
      { userId: student._id, role: 'student', year: student.year, email: student.instituteEmail, name: student.name },
      env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(200).json({ success: true, token, student });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const adminLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const isMatch = await (user as any).comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role, name: user.name, email: user.email },
      env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(200).json({ success: true, token, user: { name: user.name, email: user.email, role: user.role } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};
