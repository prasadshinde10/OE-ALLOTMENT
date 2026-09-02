import { Request, Response } from 'express';
import mongoose from 'mongoose';
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
    const elective = await Elective.findById(req.params.id);
    if (!elective) {
      res.status(404).json({ success: false, message: 'Elective not found' });
      return;
    }

    const oldElective = elective.toObject();

    const {
      name, code, offeredByDepartment, year, term,
      capacity, isActive, divisions, syllabusUrl,
    } = req.body;

    // Server-side capacity vs division-sum validation
    if (divisions && Array.isArray(divisions) && divisions.length > 0 && capacity !== undefined) {
      const totalDivCapacity = divisions.reduce(
        (acc: number, div: any) => acc + Number(div.capacity || 0), 0
      );
      if (Number(capacity) !== totalDivCapacity) {
        res.status(400).json({
          success: false,
          message: `Sum of division capacities (${totalDivCapacity}) must equal total elective capacity (${capacity}).`,
        });
        return;
      }
    }

    // Update scalar fields
    if (name !== undefined) elective.name = name;
    if (code !== undefined) elective.code = code;
    if (offeredByDepartment !== undefined) elective.offeredByDepartment = offeredByDepartment;
    if (year !== undefined) elective.year = year;
    if (term !== undefined) elective.term = term;
    if (capacity !== undefined) elective.capacity = capacity;
    if (isActive !== undefined) elective.isActive = isActive;
    if (syllabusUrl !== undefined) elective.syllabusUrl = syllabusUrl;

    // Cleanly overwrite the divisions array
    if (divisions !== undefined && Array.isArray(divisions)) {
      elective.divisions = divisions.map((div: any) => ({
        _id: div._id || new mongoose.Types.ObjectId(),
        divisionName: div.divisionName,
        facultyName: div.facultyName,
        hallRoom: div.hallRoom || '',
        facultyContact: (div.facultyContact || '').trim(),
        capacity: Number(div.capacity),
      })) as any;

      // Explicitly tell Mongoose that the nested array changed
      elective.markModified('divisions');
    }

    await elective.save();

    await logAudit({
      action: 'ELECTIVE_UPDATE',
      actorId: (req as any).user.userId,
      actorRole: 'admin',
      targetType: 'elective',
      targetId: req.params.id,
      before: oldElective,
      after: elective.toObject(),
    });

    res.status(200).json({ success: true, data: elective });
  } catch (error: any) {
    // Surface Mongoose validation errors clearly
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e: any) => e.message).join('; ');
      res.status(400).json({ success: false, message: messages });
      return;
    }
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
