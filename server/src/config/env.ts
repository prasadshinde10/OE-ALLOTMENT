import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  MONGO_URI: z.string().default('mongodb://localhost:27017/oe_allotment'),
  JWT_SECRET: z.string().default('oe_allotment_development_secret_key_2026'),
  GMAIL_USER: z.string().default('admin@mit.asia'),
  GMAIL_APP_PASSWORD: z.string().default('your_app_password_here'),
  RESEND_API_KEY: z.string().default(''),
  OTP_EXPIRY_MINUTES: z.coerce.number().default(5),
  ALLOWED_EMAIL_DOMAIN: z.string().default('mit.asia'),
  PORT: z.coerce.number().default(5000),
  CLIENT_URL: z.string().default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  AZURE_CLIENT_ID: z.string().default(''),
  AZURE_CLIENT_SECRET: z.string().default(''),
  AZURE_TENANT_ID: z.string().default(''),
  REDIRECT_URI: z.string().default(''),
  ADMIN_EMAIL: z.string().default('admin@mit.asia'),
  ADMIN_PASSWORD: z.string().optional(),
  ADMIN2_EMAIL: z.string().default('admin2@mit.asia'),
  ADMIN2_PASSWORD: z.string().optional(),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables:', _env.error.format());
  process.exit(1);
}

if (_env.data.NODE_ENV === 'production' && _env.data.JWT_SECRET === 'oe_allotment_development_secret_key_2026') {
  console.warn('⚠️ WARNING: Using default development JWT_SECRET in production. Set a strong JWT_SECRET in EC2 env file.');
}

export const env = _env.data;
