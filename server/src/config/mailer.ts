import { Resend } from 'resend';
import { env } from './env';

const resendApiKey = env.RESEND_API_KEY;
const isResendConfigured = !!resendApiKey && resendApiKey.length > 5;

const resend = isResendConfigured ? new Resend(resendApiKey) : null;

const SENDER = 'OE Allotment <onboarding@resend.dev>';

export const verifyMailer = async (): Promise<void> => {
  if (!isResendConfigured) {
    console.log('⚠️ [DEV INFO] RESEND_API_KEY not set. Generated OTPs will be displayed directly in server console.');
    return;
  }

  console.log('✅ Resend email service is configured and ready');
};

export const sendOtpEmail = async (to: string, otp: string): Promise<void> => {
  console.log(`\n======================================================`);
  console.log(`🔑 [OTP DISPATCH] Recipient: ${to} | OTP Code: ${otp}`);
  console.log(`======================================================\n`);

  if (!isResendConfigured || !resend) {
    return;
  }

  try {
    await resend.emails.send({
      from: SENDER,
      to,
      subject: 'Your OTP for OE Allotment',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>OE Allotment Platform Verification</h2>
          <p>Your One-Time Password (OTP) for verification is:</p>
          <h1 style="color: #4CAF50; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
          <p>This OTP will expire in ${env.OTP_EXPIRY_MINUTES} minutes.</p>
          <p>If you did not request this, please ignore this email.</p>
        </div>
      `,
    });
  } catch (error: any) {
    console.error('❌ Failed to send email via Resend:', error.message || error);
    console.log(`ℹ️ Use the OTP printed above in the console to proceed with verification.`);
  }
};

export const sendResetPasswordEmail = async (to: string, resetUrl: string): Promise<void> => {
  console.log(`🔐 [PASSWORD RESET] Recipient: ${to} | Reset URL: ${resetUrl}`);

  if (!isResendConfigured || !resend) {
    return;
  }

  try {
    await resend.emails.send({
      from: SENDER,
      to,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Password Reset Request</h2>
          <p>You requested to reset your password. Click the link below to reset it:</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; color: white; background-color: #007bff; text-decoration: none; border-radius: 5px;">Reset Password</a>
          <p>This link is valid for 15 minutes.</p>
          <p>If you did not request this, please ignore this email.</p>
        </div>
      `,
    });
  } catch (error: any) {
    console.error('❌ Failed to send reset email via Resend:', error.message || error);
  }
};
