import bcrypt from 'bcryptjs';
import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password?: string;
  name: string;
  role: 'admin' | 'teacher' | 'first_year_admin' | 'FY_ADMIN' | 'SUPER_ADMIN' | 'ADMIN' | 'OE_ADMIN';
  resetPasswordToken?: string | null;
  resetPasswordExpiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
      enum: ['admin', 'teacher', 'first_year_admin', 'FY_ADMIN', 'SUPER_ADMIN', 'ADMIN', 'OE_ADMIN'],
    },
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
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

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password as string);
};

export const User = mongoose.model<IUser>('User', userSchema);
export default User;
