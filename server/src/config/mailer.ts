import nodemailer from 'nodemailer';
import { env } from './env';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: env.GMAIL_USER,
    pass: env.GMAIL_APP_PASSWORD,
  },
});

export const verifyMailer = async (): Promise<void> => {
  try {
    await transporter.verify();
    console.log('✅ Mailer is ready to take our messages');
  } catch (error) {
    console.error('❌ Mailer error:', error);
  }
};

export const sendOtpEmail = async (to: string, otp: string): Promise<void> => {
  const mailOptions = {
    from: `"OE Allotment Platform" <${env.GMAIL_USER}>`,
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
  };

  await transporter.sendMail(mailOptions);
};
