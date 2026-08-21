import mongoose, { Document, Schema } from 'mongoose';

export interface ITermConfig extends Document {
  term: string;
  year: number;
  registrationOpensAt: Date;
  registrationClosesAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const termConfigSchema = new Schema<ITermConfig>(
  {
    term: {
      type: String,
      required: true,
    },
    year: {
      type: Number,
      required: true,
      enum: [1, 2, 3],
    },
    registrationOpensAt: {
      type: Date,
      required: true,
    },
    registrationClosesAt: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

termConfigSchema.index({ term: 1, year: 1 }, { unique: true });

export const TermConfig = mongoose.model<ITermConfig>('TermConfig', termConfigSchema);
export default TermConfig;
