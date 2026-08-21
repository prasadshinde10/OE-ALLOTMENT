import mongoose, { Document, Schema } from 'mongoose';

export interface IElective extends Document {
  name: string;
  code: string;
  year: number;
  term: string;
  capacity: number;
  seatsFilled: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const electiveSchema = new Schema<IElective>(
  {
    name: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      required: true,
    },
    year: {
      type: Number,
      required: true,
      enum: [1, 2, 3],
    },
    term: {
      type: String,
      required: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
    seatsFilled: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

electiveSchema.index({ code: 1, year: 1, term: 1 }, { unique: true });
electiveSchema.index({ year: 1, term: 1, isActive: 1 });

export const Elective = mongoose.model<IElective>('Elective', electiveSchema);
