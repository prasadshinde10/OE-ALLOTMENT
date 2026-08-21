import mongoose, { Document, Schema } from 'mongoose';
import { env } from '../config/env';

export interface IStudent extends Document {
  hallTicketNumber: string;
  name: string;
  instituteEmail: string;
  mobileNumber: string;
  class: string;
  rollNumber: string;
  year: number;
  isVerified: boolean;
  otpHash?: string;
  otpExpiresAt?: Date;
  otpAttempts: number;
  lastOtpSentAt?: Date;
  allocatedElectiveId?: mongoose.Types.ObjectId;
  allocatedElectiveName?: string;
  allocatedTerm?: string;
  allocationTimestamp?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const studentSchema = new Schema<IStudent>(
  {
    hallTicketNumber: {
      type: String,
      required: true,
      unique: true,
      match: [/^\d{12}$/, 'Hall ticket number must be exactly 12 digits'],
    },
    name: {
      type: String,
      required: true,
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
      required: true,
      unique: true,
      match: [/^[6-9]\d{9}$/, 'Invalid Indian mobile number'],
    },
    class: {
      type: String,
      required: true,
    },
    rollNumber: {
      type: String,
      required: true,
    },
    year: {
      type: Number,
      required: true,
      enum: [1, 2, 3],
    },
    isVerified: {
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
  { timestamps: true }
);

studentSchema.index({ year: 1, allocatedElectiveId: 1 });
studentSchema.index({ year: 1, allocatedTerm: 1 });

export const Student = mongoose.model<IStudent>('Student', studentSchema);
export default Student;
