import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../config/env';

export interface IStudent extends Document {
  hallTicketNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  fullName: string;
  instituteEmail: string;
  mobileNumber: string;
  branch: string;
  semester: string;
  rollNumber: string;
  year: number;
  password?: string;
  isVerified: boolean;
  isProfileComplete: boolean;
  otpHash?: string;
  otpExpiresAt?: Date;
  otpAttempts: number;
  lastOtpSentAt?: Date;
  resetPasswordToken?: string | null;
  resetPasswordExpiresAt?: Date | null;
  allocatedElectiveId?: mongoose.Types.ObjectId;
  allocatedElectiveName?: string;
  allocatedTerm?: string;
  allocationTimestamp?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const studentSchema = new Schema<IStudent>(
  {
    hallTicketNumber: {
      type: String,
      unique: true,
      sparse: true,
      match: [/^\d{12}$/, 'Hall ticket number must be exactly 12 digits'],
    },
    firstName: {
      type: String,
      default: '',
      trim: true,
    },
    middleName: {
      type: String,
      trim: true,
      default: '',
    },
    lastName: {
      type: String,
      default: '',
      trim: true,
    },
    instituteEmail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      validate: {
        validator: function (v: string) {
          return v.endsWith(`@${env.ALLOWED_EMAIL_DOMAIN}`);
        },
        message: `Email must end with @${env.ALLOWED_EMAIL_DOMAIN}`,
      },
    },
    mobileNumber: {
      type: String,
      unique: true,
      sparse: true,
      match: [/^[6-9]\d{9}$/, 'Invalid Indian mobile number'],
    },
    branch: {
      type: String,
      default: 'General',
    },
    semester: {
      type: String,
      default: 'Sem-5',
      enum: ['Sem-1','Sem-2','Sem-3','Sem-4','Sem-5','Sem-6','Sem-7','Sem-8'],
    },
    rollNumber: {
      type: String,
      default: '',
    },
    year: {
      type: Number,
      default: 3,
      enum: [1, 2, 3],
    },
    password: {
      type: String,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isProfileComplete: {
      type: Boolean,
      default: false,
    },
    otpHash: {
      type: String,
    },
    otpExpiresAt: {
      type: Date,
    },
    otpAttempts: {
      type: Number,
      default: 0,
    },
    lastOtpSentAt: {
      type: Date,
    },
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpiresAt: {
      type: Date,
      default: null,
    },
    allocatedElectiveId: {
      type: Schema.Types.ObjectId,
      ref: 'Elective',
      default: null,
    },
    allocatedElectiveName: {
      type: String,
      default: null,
    },
    allocatedTerm: {
      type: String,
      default: null,
    },
    allocationTimestamp: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

studentSchema.virtual('fullName').get(function(this: IStudent) {
  const parts: string[] = [];
  if (this.firstName) parts.push(this.firstName.trim());
  if (this.middleName) parts.push(this.middleName.trim());
  if (this.lastName) parts.push(this.lastName.trim());
  return parts.filter(Boolean).join(' ');
});

studentSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password as string, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

studentSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

studentSchema.index({ year: 1, allocatedElectiveId: 1 });
studentSchema.index({ year: 1, allocatedTerm: 1 });

export const Student = mongoose.model<IStudent>('Student', studentSchema);
export default Student;
