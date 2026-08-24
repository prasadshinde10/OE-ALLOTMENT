import mongoose, { Document, Schema } from 'mongoose';

export interface IBranch extends Document {
  name: string;
  year: number;
  createdAt: Date;
  updatedAt: Date;
}

const branchSchema = new Schema<IBranch>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    year: {
      type: Number,
      required: true,
      enum: [1, 2, 3],
    },
  },
  { timestamps: true }
);

branchSchema.index({ name: 1, year: 1 }, { unique: true });

export const Branch = mongoose.model<IBranch>('Branch', branchSchema);
export default Branch;
