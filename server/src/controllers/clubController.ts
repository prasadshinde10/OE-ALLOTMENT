import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Club from '../models/Club';
import Student from '../models/Student';
import { isBranchEligible } from '../utils/branchMatcher';
import { logAudit } from '../services/auditService';

export const getClubs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { year, term, category, active } = req.query;
    const filter: any = {};
    if (year) filter.year = Number(year);
    if (term) filter.term = term;
    if (category) filter.category = category;
    if (active !== undefined) filter.isActive = active === 'true';

    const clubs = await Club.find(filter).sort({ category: 1, name: 1 });

    // If studentBranch query param is provided, filter co-curricular clubs by branch eligibility
    const { studentBranch } = req.query;
    if (studentBranch && typeof studentBranch === 'string') {
      const filtered = clubs.filter((club) => {
        // Extra-curricular clubs are always visible
        if (club.category === 'extra-curricular') return true;
        // Co-curricular clubs: check target branch eligibility
        return isBranchEligible(studentBranch, (club as any).targetBranches || []);
      });
      res.status(200).json({ success: true, data: filtered });
      return;
    }

    res.status(200).json({ success: true, data: clubs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const getClubById = async (req: Request, res: Response): Promise<void> => {
  try {
    const club = await Club.findById(req.params.id);
    if (!club) {
      res.status(404).json({ success: false, message: 'Club not found' });
      return;
    }
    res.status(200).json({ success: true, data: club });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const createClub = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      code,
      category,
      offeredByDepartment,
      year = 1,
      term = 'Sem-1',
      capacity,
      divisions,
      syllabusUrl,
      coordinatorName,
      coordinatorContact,
      description,
      targetBranches,
    } = req.body;



    // Server-side capacity vs division-sum validation
    if (divisions && Array.isArray(divisions) && divisions.length > 0 && capacity !== undefined) {
      const totalDivCapacity = divisions.reduce(
        (acc: number, div: any) => acc + Number(div.capacity || 0),
        0
      );
      if (Number(capacity) !== totalDivCapacity) {
        res.status(400).json({
          success: false,
          message: `Sum of division capacities (${totalDivCapacity}) must equal total club capacity (${capacity}).`,
        });
        return;
      }
    }

    const club = new Club({
      name,
      code,
      category,
      offeredByDepartment,
      year: Number(year),
      term,
      capacity: Number(capacity),
      divisions: divisions || [],
      syllabusUrl,
      coordinatorName,
      coordinatorContact,
      description,
      targetBranches: targetBranches || [],
    });

    await club.save();

    await logAudit({
      action: 'CLUB_CREATE',
      actorId: (req as any).user?.userId || 'system',
      actorRole: (req as any).user?.role || 'first_year_admin',
      targetType: 'club',
      targetId: club.id,
      after: req.body,
    });

    res.status(201).json({ success: true, data: club });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(400).json({
        success: false,
        message: 'A club with this code and category already exists for this term.',
      });
      return;
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors)
        .map((e: any) => e.message)
        .join('; ');
      res.status(400).json({ success: false, message: messages });
      return;
    }
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const updateClub = async (req: Request, res: Response): Promise<void> => {
  try {
    const club = await Club.findById(req.params.id);
    if (!club) {
      res.status(404).json({ success: false, message: 'Club not found' });
      return;
    }

    const oldClub = club.toObject();
    const {
      name,
      code,
      category,
      offeredByDepartment,
      year,
      term,
      capacity,
      isActive,
      divisions,
      syllabusUrl,
      coordinatorName,
      coordinatorContact,
      description,
      targetBranches,
    } = req.body;

    if (divisions && Array.isArray(divisions) && divisions.length > 0 && capacity !== undefined) {
      const totalDivCapacity = divisions.reduce(
        (acc: number, div: any) => acc + Number(div.capacity || 0),
        0
      );
      if (Number(capacity) !== totalDivCapacity) {
        res.status(400).json({
          success: false,
          message: `Sum of division capacities (${totalDivCapacity}) must equal total club capacity (${capacity}).`,
        });
        return;
      }
    }

    if (name !== undefined) club.name = name;
    if (code !== undefined) club.code = code;
    if (category !== undefined) club.category = category;
    if (offeredByDepartment !== undefined) club.offeredByDepartment = offeredByDepartment;
    if (year !== undefined) club.year = Number(year);
    if (term !== undefined) club.term = term;
    if (capacity !== undefined) club.capacity = Number(capacity);
    if (isActive !== undefined) club.isActive = isActive;
    if (syllabusUrl !== undefined) club.syllabusUrl = syllabusUrl;
    if (coordinatorName !== undefined) {
      club.coordinatorName = (coordinatorName || '').trim();
    }
    if (coordinatorContact !== undefined) {
      club.coordinatorContact = (coordinatorContact || '').trim();
    }
    if (description !== undefined) club.description = description;
    if (targetBranches !== undefined) (club as any).targetBranches = targetBranches;

    if (divisions !== undefined && Array.isArray(divisions)) {
      club.divisions = divisions.map((div: any) => ({
        _id: div._id || new mongoose.Types.ObjectId(),
        divisionName: div.divisionName,
        coordinatorName: div.coordinatorName || div.facultyName || '',
        facultyName: div.facultyName || div.coordinatorName || '',
        hallRoom: div.hallRoom || '',
        coordinatorContact: (div.coordinatorContact || div.facultyContact || '').trim(),
        facultyContact: (div.facultyContact || div.coordinatorContact || '').trim(),
        capacity: Number(div.capacity),
      })) as any;

      club.markModified('divisions');
    }

    await club.save();

    await logAudit({
      action: 'CLUB_UPDATE',
      actorId: (req as any).user?.userId || 'system',
      actorRole: (req as any).user?.role || 'first_year_admin',
      targetType: 'club',
      targetId: req.params.id,
      before: oldClub,
      after: club.toObject(),
    });

    res.status(200).json({ success: true, data: club });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors)
        .map((e: any) => e.message)
        .join('; ');
      res.status(400).json({ success: false, message: messages });
      return;
    }
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const deleteClub = async (req: Request, res: Response): Promise<void> => {
  try {
    const club = await Club.findById(req.params.id);
    if (!club) {
      res.status(404).json({ success: false, message: 'Club not found' });
      return;
    }

    if (club.seatsFilled > 0) {
      club.isActive = false;
      await club.save();
    } else {
      await Club.findByIdAndDelete(req.params.id);
    }

    await logAudit({
      action: 'CLUB_DELETE',
      actorId: (req as any).user?.userId || 'system',
      actorRole: (req as any).user?.role || 'first_year_admin',
      targetType: 'club',
      targetId: req.params.id,
      metadata: { seatsFilled: club.seatsFilled },
    });

    res.status(200).json({ success: true, message: 'Club deleted/deactivated' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};
