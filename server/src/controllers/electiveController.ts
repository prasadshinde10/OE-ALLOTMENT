import { Request, Response } from 'express';
import Elective from '../models/Elective';
import { logAudit } from '../services/auditService';

export const getElectives = async (req: Request, res: Response): Promise<void> => {
  try {
    const { year, term, active } = req.query;
    const filter: any = {};
    if (year) filter.year = year;
    if (term) filter.term = term;
    if (active !== undefined) filter.isActive = active === 'true';

    const electives = await Elective.find(filter);
    res.status(200).json({ success: true, data: electives });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const getElectiveById = async (req: Request, res: Response): Promise<void> => {
  try {
    const elective = await Elective.findById(req.params.id);
    if (!elective) {
      res.status(404).json({ success: false, message: 'Elective not found' });
      return;
    }
    res.status(200).json({ success: true, data: elective });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const createElective = async (req: Request, res: Response): Promise<void> => {
  try {
    const elective = new Elective(req.body);
    await elective.save();
    
    await logAudit({ action: 'ELECTIVE_CREATE', actorId: (req as any).user.userId, actorRole: 'admin', targetType: 'elective', targetId: elective.id, after: req.body });
    res.status(201).json({ success: true, data: elective });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const updateElective = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, capacity, isActive } = req.body;
    const oldElective = await Elective.findById(req.params.id);
    if (!oldElective) {
      res.status(404).json({ success: false, message: 'Elective not found' });
      return;
    }

    const updated = await Elective.findByIdAndUpdate(req.params.id, { name, capacity, isActive }, { new: true });
    
    await logAudit({ 
      action: 'ELECTIVE_UPDATE', 
      actorId: (req as any).user.userId, 
      actorRole: 'admin',
      targetType: 'elective',
      targetId: req.params.id, 
      before: oldElective,
      after: updated 
    });
    
    res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const deleteElective = async (req: Request, res: Response): Promise<void> => {
  try {
    const elective = await Elective.findById(req.params.id);
    if (!elective) {
      res.status(404).json({ success: false, message: 'Elective not found' });
      return;
    }

    if (elective.seatsFilled > 0) {
      elective.isActive = false;
      await elective.save();
    } else {
      await Elective.findByIdAndDelete(req.params.id);
    }
    
    await logAudit({ action: 'ELECTIVE_DELETE', actorId: (req as any).user.userId, actorRole: 'admin', targetType: 'elective', targetId: req.params.id, metadata: { seatsFilled: elective.seatsFilled } });
    res.status(200).json({ success: true, message: 'Elective deleted/deactivated' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};
