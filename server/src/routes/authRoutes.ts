import { Router } from 'express';
import { sendOtp, verifyOtp, resendOtp, studentLogin, adminLogin } from '../controllers/authController';
import { authRateLimiter, otpRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/send-otp', authRateLimiter, otpRateLimiter, sendOtp);
router.post('/verify-otp', authRateLimiter, verifyOtp);
router.post('/resend-otp', otpRateLimiter, resendOtp);
router.post('/student/login', authRateLimiter, studentLogin);
router.post('/admin/login', authRateLimiter, adminLogin);

export default router;
