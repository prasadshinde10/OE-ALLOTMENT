import { AuditLog } from '../models/AuditLog';

interface AuditParams {
  action: string;
  actorId: string;
  actorRole: 'student' | 'admin' | 'teacher' | 'system';
  targetType: 'student' | 'elective' | 'term_config' | 'user';
  targetId?: string;
  before?: any;
  after?: any;
  metadata?: any;
}

export const logAudit = async (params: AuditParams): Promise<void> => {
  try {
    await AuditLog.create(params);
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
};
