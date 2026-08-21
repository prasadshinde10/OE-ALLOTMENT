import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import Student from '../models/Student';
import { sendOtpEmail } from '../config/mailer';
import { env } from '../config/env';

export const generateOtp = (): string => {
  const buf = crypto.randomBytes(3);
  return parseInt(buf.toString('hex'), 16).toString().padStart(6, '0').slice(0, 6);
};

export const sendAndStoreOtp = async (studentId: string): Promise<void> => {
  const student = await Student.findById(studentId);
  if (!student) throw new Error('Student not found');
  
  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  
  student.otpHash = otpHash;
  student.otpExpiresAt = new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000);
  student.otpAttempts = 0;
  student.lastOtpSentAt = new Date();
  
  await student.save();
  await sendOtpEmail(student.instituteEmail, otp);
};

export const verifyOtp = async (email: string, inputOtp: string) => {
  const student = await Student.findOneAndUpdate(
    { instituteEmail: email },
    { $inc: { otpAttempts: 1 } },
    { new: true }
  );
  
  if (!student) return { valid: false, message: 'Student not found' };
  if (!student.otpHash || !student.otpExpiresAt) return { valid: false, message: 'OTP not requested' };
  if (new Date() > student.otpExpiresAt) return { valid: false, message: 'OTP expired' };
  if (student.otpAttempts > 5) return { valid: false, message: 'Too many failed attempts' };
  
  const isValid = await bcrypt.compare(inputOtp, student.otpHash);
  if (!isValid) return { valid: false, message: 'Invalid OTP' };
  
  student.isVerified = true;
  student.otpHash = undefined;
  student.otpExpiresAt = undefined;
  student.otpAttempts = 0;
  await student.save();
  
  return { valid: true, message: 'OTP verified successfully', student };
};

export const canResendOtp = (student: any): boolean => {
  if (!student.lastOtpSentAt) return true;
  const timeDiff = new Date().getTime() - new Date(student.lastOtpSentAt).getTime();
  return timeDiff > 60 * 1000; // 60 seconds
};
