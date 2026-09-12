import { Request, Response } from 'express';
import Student from '../models/Student';
import Club from '../models/Club';
import TermConfig from '../models/TermConfig';
import Branch from '../models/Branch';
import AuditLog from '../models/AuditLog';
import { logAudit } from '../services/auditService';
import { transferClubSeat } from '../services/clubAllocationService';
import { broadcastClubSeatUpdate } from '../socket';
import { reconcileSeats } from '../services/allocationEngine';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const archiver = require('archiver');

export const getFYStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [
      totalFYStudents,
      verifiedFYStudents,
      coCurricularAllocated,
      extraCurricularAllocated,
      fullyAllocated,
      activeClubs,
      totalClubs,
      coCurricularClubs,
      extraCurricularClubs,
    ] = await Promise.all([
      Student.countDocuments({ year: 1 }),
      Student.countDocuments({ year: 1, isVerified: true }),
      Student.countDocuments({ year: 1, allocatedCoCurricularClubId: { $ne: null } }),
      Student.countDocuments({ year: 1, allocatedExtraCurricularClubId: { $ne: null } }),
      Student.countDocuments({
        year: 1,
        allocatedCoCurricularClubId: { $ne: null },
        allocatedExtraCurricularClubId: { $ne: null },
      }),
      Club.countDocuments({ year: 1, isActive: true }),
      Club.countDocuments({ year: 1 }),
      Club.countDocuments({ year: 1, category: 'co-curricular', isActive: true }),
      Club.countDocuments({ year: 1, category: 'extra-curricular', isActive: true }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalFYStudents,
        verifiedFYStudents,
        coCurricularAllocated,
        extraCurricularAllocated,
        fullyAllocated,
        activeClubs,
        totalClubs,
        coCurricularClubs,
        extraCurricularClubs,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const getFYStudents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { branch, search, page = 1, limit = 10, status, clubType, category } = req.query;
    const filter: any = { year: 1 };

    if (branch) filter.branch = branch;

    const typeFilter = clubType || category;
    if (typeFilter === 'co-curricular' || typeFilter === 'co') {
      filter.allocatedCoCurricularClubId = { $ne: null };
    } else if (typeFilter === 'extra-curricular' || typeFilter === 'extra') {
      filter.allocatedExtraCurricularClubId = { $ne: null };
    }

    if (status === 'allocated_both') {
      filter.allocatedCoCurricularClubId = { $ne: null };
      filter.allocatedExtraCurricularClubId = { $ne: null };
    } else if (status === 'allocated_partial') {
      filter.$or = [
        { allocatedCoCurricularClubId: { $ne: null }, allocatedExtraCurricularClubId: null },
        { allocatedCoCurricularClubId: null, allocatedExtraCurricularClubId: { $ne: null } },
      ];
    } else if (status === 'unallocated') {
      filter.allocatedCoCurricularClubId = null;
      filter.allocatedExtraCurricularClubId = null;
    }

    if (search) {
      const searchRegex = { $regex: String(search), $options: 'i' };
      filter.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { hallTicketNumber: searchRegex },
        { instituteEmail: searchRegex },
        { rollNumber: searchRegex },
      ];
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(200, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [students, total] = await Promise.all([
      Student.find(filter).sort({ branch: 1, rollNumber: 1 }).skip(skip).limit(limitNum).lean(),
      Student.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: students,
      total,
      page: pageNum,
      limit: limitNum,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

function buildFYClubCSV(students: any[]): string {
  const headers = [
    'PRN / Hall Ticket',
    'Roll Number',
    'First Name',
    'Middle Name',
    'Last Name',
    'Department / Branch',
    'Co-Curricular Club',
    'Co-Curricular Division',
    'Co-Curricular Coordinator',
    'Co-Curricular Phone',
    'Co-Curricular Hall',
    'Extra-Curricular Club',
    'Extra-Curricular Division',
    'Extra-Curricular Coordinator',
    'Extra-Curricular Phone',
    'Extra-Curricular Hall',
  ];

  const escape = (v: any) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const rows = students.map((s) =>
    [
      escape(s.hallTicketNumber),
      escape(s.rollNumber),
      escape(s.firstName),
      escape(s.middleName),
      escape(s.lastName),
      escape(s.branch),
      escape(s.allocatedCoCurricularClubName || 'Unallocated'),
      escape(s.allocatedCoCurricularDivision || 'N/A'),
      escape(s.allocatedCoCurricularCoordinator || 'N/A'),
      escape(s.allocatedCoCurricularContact || 'N/A'),
      escape(s.allocatedCoCurricularHall || 'N/A'),
      escape(s.allocatedExtraCurricularClubName || 'Unallocated'),
      escape(s.allocatedExtraCurricularDivision || 'N/A'),
      escape(s.allocatedExtraCurricularCoordinator || 'N/A'),
      escape(s.allocatedExtraCurricularContact || 'N/A'),
      escape(s.allocatedExtraCurricularHall || 'N/A'),
    ].join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

export const exportFYClubCSV = async (req: Request, res: Response): Promise<void> => {
  try {
    const { branch, clubId, category, clubType } = req.query;
    const filter: any = { year: 1 };

    if (branch) filter.branch = branch;
    const typeFilter = clubType || category;
    if (clubId) {
      if (typeFilter === 'extra-curricular' || typeFilter === 'extra') {
        filter.allocatedExtraCurricularClubId = clubId;
      } else {
        filter.allocatedCoCurricularClubId = clubId;
      }
    } else if (typeFilter === 'extra-curricular' || typeFilter === 'extra') {
      filter.allocatedExtraCurricularClubId = { $ne: null };
    } else if (typeFilter === 'co-curricular' || typeFilter === 'co') {
      filter.allocatedCoCurricularClubId = { $ne: null };
    }

    const students = await Student.find(filter).sort({ branch: 1, rollNumber: 1 }).lean();

    const csv = buildFYClubCSV(students);
    const filename = branch
      ? `FY_${String(branch).replace(/\s+/g, '_')}_Clubs_Report.csv`
      : 'FY_All_Departments_Clubs_Report.csv';

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const exportFYAllClubsZip = async (req: Request, res: Response): Promise<void> => {
  try {
    const students = await Student.find({ year: 1 }).sort({ branch: 1, rollNumber: 1 }).lean();

    const groupedByDept: Record<string, any[]> = {};
    for (const s of students) {
      const dept = s.branch || 'Other';
      if (!groupedByDept[dept]) groupedByDept[dept] = [];
      groupedByDept[dept].push(s);
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="FY_Department_Clubs_Reports.zip"');

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err: Error) => {
      throw err;
    });
    archive.pipe(res);

    for (const [dept, deptStudents] of Object.entries(groupedByDept)) {
      const csv = '\uFEFF' + buildFYClubCSV(deptStudents);
      const safeFilename = dept.replace(/[^a-zA-Z0-9_&-]/g, '_');
      archive.append(csv, { name: `FY_${safeFilename}_Clubs_Report.csv` });
    }

    await archive.finalize();
  } catch (error: any) {
    console.error('ZIP export error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: error.message || 'Server Error' });
    }
  }
};

// Term Config scoped to FY (Year 1)
export const getFYTermConfigs = async (_req: Request, res: Response): Promise<void> => {
  try {
    const configs = await TermConfig.find({ year: 1 }).sort({ term: 1 });
    res.status(200).json({ success: true, data: configs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const createFYTermConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const config = new TermConfig({ ...req.body, year: 1 });
    await config.save();
    await logAudit({
      action: 'FY_TERM_CONFIG_CREATE',
      actorId: (req as any).user?.userId || 'system',
      actorRole: 'first_year_admin',
      targetType: 'term_config',
      targetId: config.id,
    });
    res.status(201).json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const updateFYTermConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const updated = await TermConfig.findOneAndUpdate({ _id: req.params.id, year: 1 }, req.body, {
      new: true,
    });
    if (!updated) {
      res.status(404).json({ success: false, message: 'FY Term configuration not found' });
      return;
    }
    await logAudit({
      action: 'FY_TERM_CONFIG_UPDATE',
      actorId: (req as any).user?.userId || 'system',
      actorRole: 'first_year_admin',
      targetType: 'term_config',
      targetId: updated.id,
    });
    res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

// Branches scoped to FY (Year 1)
export const getFYBranches = async (_req: Request, res: Response): Promise<void> => {
  try {
    const branches = await Branch.find({ year: 1 }).sort({ name: 1 });
    res.status(200).json({ success: true, data: branches });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const createFYBranch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: 'Branch name is required' });
      return;
    }

    const trimmedName = name.trim();
    // Check if already exists for year 1
    const existing = await Branch.findOne({
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
      year: 1,
    });
    if (existing) {
      res.status(409).json({ success: false, message: 'Branch already exists for First-Year' });
      return;
    }

    const branch = new Branch({ name: trimmedName, year: 1 });
    await branch.save();

    await logAudit({
      action: 'FY_BRANCH_CREATED',
      actorId: (req as any).user?.userId || 'system',
      actorRole: 'first_year_admin',
      targetType: 'branch',
      targetId: branch.id,
      after: { name: branch.name, year: 1 },
    });

    res.status(201).json({ success: true, data: branch });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({ success: false, message: 'Branch already exists for First-Year' });
      return;
    }
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const updateFYBranch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: 'Branch name is required' });
      return;
    }

    const trimmedName = name.trim();
    const existing = await Branch.findOne({
      _id: { $ne: id },
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
      year: 1,
    });
    if (existing) {
      res.status(409).json({ success: false, message: 'Another branch with this name already exists for First-Year' });
      return;
    }

    const branch = await Branch.findOneAndUpdate(
      { _id: id, year: 1 },
      { name: trimmedName },
      { new: true, runValidators: true }
    );

    if (!branch) {
      res.status(404).json({ success: false, message: 'FY Branch not found' });
      return;
    }

    await logAudit({
      action: 'FY_BRANCH_UPDATED',
      actorId: (req as any).user?.userId || 'system',
      actorRole: 'first_year_admin',
      targetType: 'branch',
      targetId: branch.id,
      after: { name: branch.name, year: 1 },
    });

    res.status(200).json({ success: true, data: branch });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({ success: false, message: 'Branch already exists for First-Year' });
      return;
    }
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const deleteFYBranch = async (req: Request, res: Response): Promise<void> => {
  try {
    const branch = await Branch.findOneAndDelete({ _id: req.params.id, year: 1 });
    if (!branch) {
      res.status(404).json({ success: false, message: 'FY Branch not found' });
      return;
    }

    await logAudit({
      action: 'FY_BRANCH_DELETED',
      actorId: (req as any).user?.userId || 'system',
      actorRole: 'first_year_admin',
      targetType: 'branch',
      targetId: req.params.id,
    });

    res.status(200).json({ success: true, message: 'FY Branch deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const reassignStudentClub = async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentId, newClubId } = req.body;
    if (!studentId || !newClubId) {
      res.status(400).json({ success: false, message: 'studentId and newClubId are required' });
      return;
    }

    const adminId = (req as any).user?.userId || 'admin2';
    const result = await transferClubSeat(studentId, newClubId, adminId);

    // Real-time broadcast
    if (result.newClub) {
      broadcastClubSeatUpdate({
        clubId: result.newClub._id.toString(),
        seatsFilled: result.newClub.seatsFilled,
        capacity: result.newClub.capacity,
        remaining: Math.max(0, result.newClub.capacity - result.newClub.seatsFilled),
      });
    }
    if (result.oldClubId) {
      const oldClub = await Club.findById(result.oldClubId);
      if (oldClub) {
        broadcastClubSeatUpdate({
          clubId: oldClub._id.toString(),
          seatsFilled: oldClub.seatsFilled,
          capacity: oldClub.capacity,
          remaining: Math.max(0, oldClub.capacity - oldClub.seatsFilled),
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Student club allocation reassigned successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Reallocation error:', error);
    res.status(400).json({ success: false, message: error.message || 'Reallocation failed' });
  }
};

/**
 * POST /api/fy-admin/reconcile-seats
 * Recalculates Club.seatsFilled from actual Student allocations using an
 * aggregation pipeline, updates MongoDB, re-syncs the in-memory engine,
 * and broadcasts corrected counts to connected clients.
 */
export const reconcileClubSeats = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await reconcileSeats();

    // Broadcast corrected seat counts for all FY clubs
    const fyClubs = await Club.find({ year: 1 }).lean();
    for (const club of fyClubs) {
      broadcastClubSeatUpdate({
        clubId: club._id.toString(),
        seatsFilled: club.seatsFilled,
        capacity: club.capacity,
        remaining: Math.max(0, club.capacity - club.seatsFilled),
      });
    }

    await logAudit({
      action: 'FY_SEATS_RECONCILED',
      actorId: (req as any).user?.userId || 'system',
      actorRole: (req as any).user?.role || 'first_year_admin',
      targetType: 'club',
      metadata: {
        clubsChecked: result.clubsChecked,
        clubsCorrected: result.clubsCorrected,
        corrections: result.corrections,
      },
    });

    res.status(200).json({
      success: true,
      message: `Reconciliation complete — ${result.clubsCorrected} of ${result.clubsChecked} clubs corrected.`,
      data: result,
    });
  } catch (error: any) {
    console.error('Reconciliation error:', error);
    res.status(500).json({ success: false, message: error.message || 'Reconciliation failed' });
  }
};

