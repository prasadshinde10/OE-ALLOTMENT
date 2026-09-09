import mongoose, { Document, Schema } from 'mongoose';

export interface ITermConfig extends Document {
  term: string;
  year: number;
  registrationOpensAt: Date;
  registrationClosesAt: Date;
  isActive: boolean;
  isRegistrationActive?: boolean;
  registrationStartDate?: Date | null;
  registrationEndDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const termConfigSchema = new Schema<ITermConfig>(
  {
    term: {
      type: String,
      required: true,
      enum: ['Sem-1','Sem-2','Sem-3','Sem-4','Sem-5','Sem-6','Sem-7','Sem-8'],
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
    isRegistrationActive: {
      type: Boolean,
      default: true,
    },
    registrationStartDate: {
      type: Date,
      default: null,
    },
    registrationEndDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

termConfigSchema.index({ term: 1, year: 1 }, { unique: true });

export const TermConfig = mongoose.model<ITermConfig>('TermConfig', termConfigSchema);
export default TermConfig;
