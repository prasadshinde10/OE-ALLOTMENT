import nodemailer from 'nodemailer';
import { env } from './env';

const isPlaceholderPassword =
  !env.GMAIL_APP_PASSWORD ||
  env.GMAIL_APP_PASSWORD === 'your_app_password_here' ||
  env.GMAIL_APP_PASSWORD === 'your_app_password';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // STARTTLS
  auth: {
    user: env.GMAIL_USER,
    pass: env.GMAIL_APP_PASSWORD,
  },
});

export const verifyMailer = async (): Promise<void> => {
  if (isPlaceholderPassword) {
    console.log('⚠️ [DEV INFO] Gmail App Password not set or using placeholder. Generated OTPs will be displayed directly in server console.');
    return;
  }

  try {
    await transporter.verify();
    console.log('✅ Mailer is ready to send OTP emails');
  } catch (error: any) {
    console.warn('⚠️ SMTP verification warning (will log OTPs to console in dev):', error.message || error);
  }
};

export const sendOtpEmail = async (to: string, otp: string): Promise<void> => {
  console.log(`\n======================================================`);
  console.log(`🔑 [OTP DISPATCH] Recipient: ${to} | OTP Code: ${otp}`);
  console.log(`======================================================\n`);

  if (isPlaceholderPassword) {
    return;
  }

  try {
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
  } catch (error: any) {
    console.error('❌ Failed to send email via SMTP:', error.message || error);
    console.log(`ℹ️ Use the OTP printed above in the console to proceed with verification.`);
  }
};
