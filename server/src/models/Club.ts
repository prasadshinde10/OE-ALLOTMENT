import mongoose, { Document, Schema } from 'mongoose';

export interface IClubDivision {
  _id?: mongoose.Types.ObjectId;
  divisionName: string;
  facultyName?: string;
  coordinatorName: string;
  hallRoom?: string;
  coordinatorContact?: string;
  facultyContact?: string;
  capacity: number;
}

export interface IClub extends Document {
  name: string;
  code: string;
  category: 'co-curricular' | 'extra-curricular';
  offeredByDepartment?: string;
  year: number;
  term: string;
  capacity: number;
  seatsFilled: number;
  isActive: boolean;
  divisions: IClubDivision[];
  syllabusUrl?: string;
  coordinatorName?: string;
  coordinatorContact?: string;
  description?: string;
  targetBranches?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const clubDivisionSchema = new Schema<IClubDivision>(
  {
    divisionName: { type: String, required: true, trim: true },
    coordinatorName: { type: String, trim: true, default: '' },
    facultyName: { type: String, trim: true, default: '' },
    hallRoom: { type: String, trim: true, default: '' },
    coordinatorContact: {
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
    facultyContact: {
      type: String,
      trim: true,
      default: '',
    },
    capacity: { type: Number, required: true, min: 1 },
  },
  { _id: true }
);

// Pre-save / init hook to ensure coordinatorName / facultyName alias synchronization
clubDivisionSchema.pre('validate', function (next) {
  if (this.coordinatorName && !this.facultyName) {
    this.facultyName = this.coordinatorName;
  } else if (this.facultyName && !this.coordinatorName) {
    this.coordinatorName = this.facultyName;
  }
  if (this.coordinatorContact && !this.facultyContact) {
    this.facultyContact = this.coordinatorContact;
  } else if (this.facultyContact && !this.coordinatorContact) {
    this.coordinatorContact = this.facultyContact;
  }
  next();
});

const clubSchema = new Schema<IClub>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['co-curricular', 'extra-curricular'],
    },
    offeredByDepartment: {
      type: String,
      default: '',
      trim: true,
    },
    year: {
      type: Number,
      required: true,
      default: 1,
    },
    term: {
      type: String,
      required: true,
      enum: ['Sem-1', 'Sem-2', 'Sem-3', 'Sem-4', 'Sem-5', 'Sem-6', 'Sem-7', 'Sem-8'],
      default: 'Sem-1',
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
      type: [clubDivisionSchema],
      default: [],
    },
    syllabusUrl: {
      type: String,
      trim: true,
      default: '',
    },
    coordinatorName: {
      type: String,
      trim: true,
      default: '',
    },
    coordinatorContact: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    targetBranches: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

clubSchema.index({ code: 1, category: 1, year: 1, term: 1 }, { unique: true });
clubSchema.index({ year: 1, term: 1, category: 1, isActive: 1 });

export const Club = mongoose.model<IClub>('Club', clubSchema);
export default Club;
