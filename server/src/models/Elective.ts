import mongoose, { Document, Schema } from 'mongoose';

export interface IDivision {
  divisionName: string;
  facultyName: string;
  hallRoom?: string;
  facultyContact?: string;
  capacity: number;
}

export interface IElective extends Document {
  name: string;
  code: string;
  offeredByDepartment?: string;
  year: number;
  term: string;
  capacity: number;
  seatsFilled: number;
  isActive: boolean;
  divisions: IDivision[];
  syllabusUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const divisionSchema = new Schema<IDivision>(
  {
    divisionName: { type: String, required: true, trim: true },
    facultyName: { type: String, required: true, trim: true },
    hallRoom: { type: String, trim: true, default: '' },
    facultyContact: {
      type: String,
      trim: true,
      default: '',
      validate: {
        validator: function (v: string) {
          return v === '' || /^\d{10}$/.test(v);
        },
        message: 'Phone number must be exactly 10 digits',
      },
    },
    capacity: { type: Number, required: true, min: 1 },
  },
  { _id: true }
);

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
    offeredByDepartment: {
      type: String,
      default: '',
      trim: true,
    },
    year: {
      type: Number,
      required: true,
      enum: [1, 2, 3],
    },
    term: {
      type: String,
      required: true,
      enum: ['Sem-1','Sem-2','Sem-3','Sem-4','Sem-5','Sem-6','Sem-7','Sem-8'],
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
    divisions: {
      type: [divisionSchema],
      default: [],
    },
    syllabusUrl: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

electiveSchema.index({ code: 1, year: 1, term: 1 }, { unique: true });
electiveSchema.index({ year: 1, term: 1, isActive: 1 });

export const Elective = mongoose.model<IElective>('Elective', electiveSchema);
export default Elective;
