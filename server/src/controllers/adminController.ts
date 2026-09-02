import { Request, Response } from 'express';
import User from '../models/User';
import Student from '../models/Student';
import Elective from '../models/Elective';
import TermConfig from '../models/TermConfig';
import AuditLog from '../models/AuditLog';
import Branch from '../models/Branch';
import { logAudit } from '../services/auditService';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const archiver = require('archiver');

export const getStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [totalStudents, verifiedStudents, allocatedStudents, activeElectives, totalElectives] = await Promise.all([
      Student.countDocuments(),
      Student.countDocuments({ isVerified: true }),
      Student.countDocuments({ allocatedElectiveId: { $ne: null } }),
      Elective.countDocuments({ isActive: true }),
      Elective.countDocuments(),
    ]);
    res.status(200).json({
      success: true,
      data: { totalStudents, verifiedStudents, allocatedStudents, activeElectives, totalElectives },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const getDuplicates = async (req: Request, res: Response): Promise<void> => {
  try {
    const duplicates = await Student.aggregate([
      {
        $group: {
          _id: { $toLower: { $concat: ['$firstName', ' ', '$lastName'] } },
          count: { $sum: 1 },
          records: { $push: '$$ROOT' },
        },
      },
      { $match: { count: { $gt: 1 } } },
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
    await logAudit({
      action: 'STUDENT_REJECT',
      actorId: (req as any).user.userId,
      actorRole: 'admin',
      targetType: 'student',
      targetId: req.params.id,
    });
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
    await logAudit({
      action: 'USER_CREATE',
      actorId: (req as any).user.userId,
      actorRole: 'admin',
      targetType: 'user',
      targetId: user.id,
    });
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
    const configs = await TermConfig.find().sort({ year: 1, term: 1 });
    res.status(200).json({ success: true, data: configs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const createTermConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const config = new TermConfig(req.body);
    await config.save();
    await logAudit({
      action: 'TERM_CONFIG_CREATE',
      actorId: (req as any).user.userId,
      actorRole: 'admin',
      targetType: 'term_config',
      targetId: config.id,
    });
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
    await logAudit({
      action: 'TERM_CONFIG_UPDATE',
      actorId: (req as any).user.userId,
      actorRole: 'admin',
      targetType: 'term_config',
      targetId: updated.id,
    });
    res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

// Branch Management
export const createBranch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, year } = req.body;
    if (!name || !year) {
      res.status(400).json({ success: false, message: 'Name and year are required' });
      return;
    }

    const branch = new Branch({ name: name.trim(), year: Number(year) });
    await branch.save();

    await logAudit({
      action: 'BRANCH_CREATED',
      actorId: (req as any).user?.userId || 'admin',
      actorRole: 'admin',
      targetType: 'branch',
      targetId: branch.id,
      after: { name: branch.name, year: branch.year },
    });

    res.status(201).json({ success: true, data: branch });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({ success: false, message: 'Branch already exists for this academic year' });
      return;
    }
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const getBranches = async (req: Request, res: Response): Promise<void> => {
  try {
    const { year } = req.query;
    const filter: any = {};
    if (year) filter.year = Number(year);

    const branches = await Branch.find(filter).sort({ year: 1, name: 1 });
    res.status(200).json({ success: true, data: branches });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const deleteBranch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const branch = await Branch.findByIdAndDelete(id);
    if (!branch) {
      res.status(404).json({ success: false, message: 'Branch not found' });
      return;
    }

    await logAudit({
      action: 'BRANCH_DELETED',
      actorId: (req as any).user?.userId || 'admin',
      actorRole: 'admin',
      targetType: 'branch',
      targetId: id,
      before: { name: branch.name, year: branch.year },
    });

    res.status(200).json({ success: true, message: 'Branch deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

// ─── Department Overview & Export ─────────────────────────────────────────────

/** Helper: build CSV string from student rows */
function buildDepartmentCSV(students: any[]): string {
  const headers = [
    'PRN', 'First Name', 'Middle Name', 'Last Name', 'Department', 'Year',
    'Elective Name', 'Division', 'Faculty Name', 'Faculty Phone', 'Hall Allotment',
  ];
  const escape = (v: any) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const rows = students.map((s) => [
    escape(s.hallTicketNumber),
    escape(s.firstName),
    escape(s.middleName),
    escape(s.lastName),
    escape(s.branch),
    escape(s.year),
    escape(s.allocatedElectiveName),
    escape(s.allocatedDivision),
    escape(s.allocatedFaculty),
    escape(s.allocatedFacultyPhone || s.allocatedFacultyContact || 'N/A'),
    escape(s.allocatedHall),
  ].join(','));
  return [headers.join(','), ...rows].join('\n');
}

/**
 * GET /api/admin/department-overview
 * Returns all allocated students with full division data.
 * Filters: ?department=CSE&year=3&elective=<name>&page=1&limit=50
 */
export const getDepartmentOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { department, year, elective, page = '1', limit = '50' } = req.query;
    const filter: any = { allocatedElectiveId: { $ne: null } };

    if (department) filter.branch = department;
    if (year) filter.year = Number(year);
    if (elective) filter.allocatedElectiveName = elective;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(200, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [students, total] = await Promise.all([
      Student.find(filter)
        .select('firstName middleName lastName hallTicketNumber rollNumber branch year allocatedElectiveName allocatedDivision allocatedFaculty allocatedFacultyPhone allocatedHall')
        .sort({ branch: 1, allocatedElectiveName: 1, allocatedDivision: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Student.countDocuments(filter),
    ]);

    // Get unique departments for filter dropdown
    const allDepartments = await Student.distinct('branch', { allocatedElectiveId: { $ne: null } });
    const allElectives = await Student.distinct('allocatedElectiveName', { allocatedElectiveId: { $ne: null } });

    res.json({
      success: true,
      data: students,
      total,
      page: pageNum,
      limit: limitNum,
      filters: {
        departments: allDepartments.sort(),
        electives: allElectives.sort(),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

/**
 * GET /api/admin/department-overview/export
 * Downloads a CSV file for the filtered department.
 * Query: ?department=CSE (optional — omit for all)
 */
export const exportDepartmentCSV = async (req: Request, res: Response): Promise<void> => {
  try {
    const { department, year, elective } = req.query;
    const filter: any = { allocatedElectiveId: { $ne: null } };

    if (department) filter.branch = department;
    if (year) filter.year = Number(year);
    if (elective) filter.allocatedElectiveName = elective;

    const students = await Student.find(filter)
      .select('firstName middleName lastName hallTicketNumber branch year allocatedElectiveName allocatedDivision allocatedFaculty allocatedFacultyPhone allocatedHall')
      .sort({ branch: 1, allocatedDivision: 1 })
      .lean();

    const csv = buildDepartmentCSV(students);
    const filename = department
      ? `${String(department).replace(/\s+/g, '_')}_Allotment_Report.csv`
      : 'All_Departments_Allotment_Report.csv';

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

/**
 * GET /api/admin/department-overview/export-all
 * Downloads a ZIP file containing individual CSVs per department.
 */
export const exportAllDepartmentsZip = async (req: Request, res: Response): Promise<void> => {
  try {
    const filter: any = { allocatedElectiveId: { $ne: null } };
    if (req.query.year) filter.year = Number(req.query.year);

    const students = await Student.find(filter)
      .select('firstName middleName lastName hallTicketNumber branch year allocatedElectiveName allocatedDivision allocatedFaculty allocatedFacultyPhone allocatedHall')
      .sort({ branch: 1, allocatedDivision: 1 })
      .lean();

    // Group by department
    const grouped: Record<string, any[]> = {};
    for (const s of students) {
      const dept = s.branch || 'Other';
      if (!grouped[dept]) grouped[dept] = [];
      grouped[dept].push(s);
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="Department_Allotment_Reports.zip"');

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err: Error) => {
      throw err;
    });
    archive.pipe(res);

    for (const [dept, deptStudents] of Object.entries(grouped)) {
      const csv = '\uFEFF' + buildDepartmentCSV(deptStudents);
      const safeFilename = dept.replace(/[^a-zA-Z0-9_&-]/g, '_');
      archive.append(csv, { name: `${safeFilename}_Allotment_Report.csv` });
    }

    await archive.finalize();
  } catch (error: any) {
    console.error('ZIP export error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: error.message || 'Server Error' });
    }
  }
};
