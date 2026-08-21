import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  action: string;
  actorId: string;
  actorRole: 'student' | 'admin' | 'teacher' | 'system';
  targetType: 'student' | 'elective' | 'term_config' | 'user';
  targetId?: string;
  before?: any;
  after?: any;
  metadata?: any;
  timestamp: Date;
}

const auditLogSchema = new Schema<IAuditLog>({
  action: {
    type: String,
    required: true,
  },
  actorId: {
    type: String,
    required: true,
  },
  actorRole: {
    type: String,
    required: true,
    enum: ['student', 'admin', 'teacher', 'system'],
  },
  targetType: {
    type: String,
    required: true,
    enum: ['student', 'elective', 'term_config', 'user'],
  },
  targetId: {
    type: String,
  },
  before: {
    type: Schema.Types.Mixed,
  },
  after: {
    type: Schema.Types.Mixed,
  },
  metadata: {
    type: Schema.Types.Mixed,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ actorId: 1, timestamp: -1 });
auditLogSchema.index({ targetId: 1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
