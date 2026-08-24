import { Router } from 'express';
import {
  sendOtp,
  verifyOtp,
  resendOtp,
  studentLogin,
  adminLogin,
  forgotPasswordStudent,
  resetPasswordStudent,
  forgotPasswordAdmin,
  resetPasswordAdmin,
} from '../controllers/authController';
import { getBranches } from '../controllers/adminController';
import { authRateLimiter, otpRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Student registration and verification
router.post('/register', authRateLimiter, sendOtp);
router.post('/send-otp', authRateLimiter, otpRateLimiter, sendOtp);
router.post('/verify-otp', authRateLimiter, verifyOtp);
router.post('/resend-otp', otpRateLimiter, resendOtp);

// Logins
router.post('/student/login', authRateLimiter, studentLogin);
router.post('/admin/login', authRateLimiter, adminLogin);

// Forgot & Reset Password
router.post('/forgot-password/student', authRateLimiter, forgotPasswordStudent);
router.post('/reset-password/student', authRateLimiter, resetPasswordStudent);
router.post('/forgot-password/admin', authRateLimiter, forgotPasswordAdmin);
router.post('/reset-password/admin', authRateLimiter, resetPasswordAdmin);

// Public branch listing for student registration form
router.get('/branches', getBranches);

export default router;
