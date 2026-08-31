import mongoose, { Document, Schema } from 'mongoose';

export interface ITestSubmission extends Document {
  studentId: string;
  choices: string[];
  createdAt: Date;
  updatedAt: Date;
}

const testSubmissionSchema = new Schema<ITestSubmission>(
  {
    studentId: {
      type: String,
      required: true,
      index: true,
    },
    choices: {
      type: [String],
      default: [],
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 3600, // TTL index: auto-deletes test data after 60 minutes (3600 seconds)
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

// Explicit compound / single indexes for sub-5ms lookups and upserts
testSubmissionSchema.index({ studentId: 1 }, { unique: true });
testSubmissionSchema.index({ studentId: 1, createdAt: -1 });

export const TestSubmission = mongoose.model<ITestSubmission>('TestSubmission', testSubmissionSchema);
export default TestSubmission;
