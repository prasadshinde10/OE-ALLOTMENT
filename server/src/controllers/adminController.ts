import { Request, Response } from 'express';
import User from '../models/User';
import Student from '../models/Student';
import TermConfig from '../models/TermConfig';
import AuditLog from '../models/AuditLog';
import { logAudit } from '../services/auditService';

export const getDuplicates = async (req: Request, res: Response): Promise<void> => {
  try {
    const duplicates = await Student.aggregate([
      {
        $group: {
          _id: { $toLower: "$name" },
          count: { $sum: 1 },
          records: { $push: "$$ROOT" }
        }
      },
      { $match: { count: { $gt: 1 } } }
    ]);
    res.status(200).json({ success: true, data: duplicates });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const rejectDuplicate = async (req: Request, res: Response): Promise<void> => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }
    if (student.isVerified) {
      res.status(400).json({ success: false, message: 'Cannot reject verified records' });
      return;
    }
    await Student.findByIdAndDelete(req.params.id);
    await logAudit({ action: 'STUDENT_REJECT', actorId: (req as any).user.userId, actorRole: 'admin', targetType: 'student', targetId: req.params.id });
    res.status(200).json({ success: true, message: 'Duplicate record rejected' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const getAuditLog = async (req: Request, res: Response): Promise<void> => {
  try {
    const { action, actorId, targetId, from, to, page = 1, limit = 20 } = req.query;
    const filter: any = {};
    if (action) filter.action = action;
    if (actorId) filter.actorId = actorId;
    if (targetId) filter.targetId = targetId;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from as string);
      if (to) filter.createdAt.$lte = new Date(to as string);
    }
    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));
    const total = await AuditLog.countDocuments(filter);
    res.status(200).json({ success: true, data: logs, total, page: Number(page), limit: Number(limit) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role } = req.body;
    const user = new User({ name, email, password, role });
    await user.save();
    await logAudit({ action: 'USER_CREATE', actorId: (req as any).user.userId, actorRole: 'admin', targetType: 'user', targetId: user.id });
    res.status(201).json({ success: true, message: 'User created successfully' });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(400).json({ success: false, message: 'Email already exists' });
      return;
    }
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const getTermConfigs = async (req: Request, res: Response): Promise<void> => {
  try {
    const configs = await TermConfig.find();
    res.status(200).json({ success: true, data: configs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const createTermConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const config = new TermConfig(req.body);
    await config.save();
    await logAudit({ action: 'TERM_CONFIG_CREATE', actorId: (req as any).user.userId, actorRole: 'admin', targetType: 'term_config', targetId: config.id });
    res.status(201).json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const updateTermConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const updated = await TermConfig.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) {
      res.status(404).json({ success: false, message: 'Config not found' });
      return;
    }
    await logAudit({ action: 'TERM_CONFIG_UPDATE', actorId: (req as any).user.userId, actorRole: 'admin', targetType: 'term_config', targetId: updated.id });
    res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};
