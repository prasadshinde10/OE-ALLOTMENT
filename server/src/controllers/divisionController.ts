import { Request, Response } from 'express';
import Student from '../models/Student';
import Elective from '../models/Elective';
import { logAudit } from '../services/auditService';

/**
 * Department priority order for the weighted allocation algorithm.
 * Departments listed first get filled into earlier divisions.
 */
const DEPARTMENT_PRIORITY = [
  'Computer Science and Engineering',
  'Computer Science and Design',
  'Artificial Intelligence and Data Science',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electronics and Telecommunication',
];

/**
 * POST /api/admin/divisions/auto-assign/:electiveId
 * Runs the department-weighted allocation algorithm for a specific elective.
 * Groups students by department, sorts by priority, fills divisions sequentially.
 */
export const autoAssignDivisions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { electiveId } = req.params;

    const elective = await Elective.findById(electiveId);
    if (!elective) {
      res.status(404).json({ success: false, message: 'Elective not found' });
      return;
    }

    if (!elective.divisions || elective.divisions.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No divisions configured for this elective. Please add divisions first.',
      });
      return;
    }

    // Fetch all students allocated to this elective
    const students = await Student.find({
      allocatedElectiveId: elective._id,
    }).lean();

    if (students.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No students are currently allocated to this elective.',
      });
      return;
    }

    // Group students by department/branch
    const departmentGroups: Map<string, typeof students> = new Map();
    for (const student of students) {
      const dept = student.branch || 'Other';
      if (!departmentGroups.has(dept)) {
        departmentGroups.set(dept, []);
      }
      departmentGroups.get(dept)!.push(student);
    }

    // Sort departments by priority (listed departments first, then others by size)
    const sortedDepartments: string[] = [];

    // Add priority departments that have students
    for (const dept of DEPARTMENT_PRIORITY) {
      if (departmentGroups.has(dept)) {
        sortedDepartments.push(dept);
      }
    }

    // Add remaining departments sorted by group size (largest first)
    const remainingDepts = Array.from(departmentGroups.keys())
      .filter((d) => !DEPARTMENT_PRIORITY.includes(d))
      .sort((a, b) => (departmentGroups.get(b)?.length || 0) - (departmentGroups.get(a)?.length || 0));
    sortedDepartments.push(...remainingDepts);

    // Build a flat ordered list of students (department blocks in priority order)
    const orderedStudents: typeof students = [];
    for (const dept of sortedDepartments) {
      const group = departmentGroups.get(dept) || [];
      // Sort within each department by roll number for consistency
      group.sort((a, b) => (a.rollNumber || '').localeCompare(b.rollNumber || ''));
      orderedStudents.push(...group);
    }

    // Assign students to divisions sequentially
    const divisions = elective.divisions;
    const assignments: Array<{
      studentId: string;
      divisionName: string;
      facultyName: string;
      facultyContact?: string;
      hallRoom: string;
    }> = [];

    let divisionIndex = 0;
    let filledInCurrentDivision = 0;

    for (const student of orderedStudents) {
      // Find next division with available capacity
      while (
        divisionIndex < divisions.length &&
        filledInCurrentDivision >= divisions[divisionIndex].capacity
      ) {
        divisionIndex++;
        filledInCurrentDivision = 0;
      }

      if (divisionIndex >= divisions.length) {
        // All divisions are full — remaining students get the last division as overflow
        const lastDiv = divisions[divisions.length - 1];
        assignments.push({
          studentId: student._id.toString(),
          divisionName: lastDiv.divisionName,
          facultyName: lastDiv.facultyName,
          facultyContact: lastDiv.facultyContact || '',
          hallRoom: lastDiv.hallRoom || '',
        });
      } else {
        const div = divisions[divisionIndex];
        assignments.push({
          studentId: student._id.toString(),
          divisionName: div.divisionName,
          facultyName: div.facultyName,
          facultyContact: div.facultyContact || '',
          hallRoom: div.hallRoom || '',
        });
        filledInCurrentDivision++;
      }
    }

    // Bulk update all student records
    const bulkOps = assignments.map((a) => ({
      updateOne: {
        filter: { _id: a.studentId },
        update: {
          $set: {
            allocatedDivision: a.divisionName,
            allocatedFaculty: a.facultyName,
            allocatedFacultyPhone: a.facultyContact,
            allocatedFacultyContact: a.facultyContact,
            allocatedHall: a.hallRoom,
          },
        },
      },
    }));

    await Student.bulkWrite(bulkOps);

    // Build summary statistics
    const divisionSummary: Record<string, { count: number; departments: Record<string, number> }> = {};
    for (let i = 0; i < assignments.length; i++) {
      const a = assignments[i];
      const student = orderedStudents[i];
      if (!divisionSummary[a.divisionName]) {
        divisionSummary[a.divisionName] = { count: 0, departments: {} };
      }
      divisionSummary[a.divisionName].count++;
      const dept = student.branch || 'Other';
      divisionSummary[a.divisionName].departments[dept] =
        (divisionSummary[a.divisionName].departments[dept] || 0) + 1;
    }

    await logAudit({
      action: 'DIVISION_AUTO_ASSIGN',
      actorId: req.user?.userId || 'admin',
      actorRole: 'admin',
      targetType: 'elective',
      targetId: electiveId,
      metadata: {
        totalStudents: students.length,
        divisionsUsed: Object.keys(divisionSummary).length,
        summary: divisionSummary,
      },
    });

    res.json({
      success: true,
      message: `Successfully assigned ${students.length} students across ${Object.keys(divisionSummary).length} divisions`,
      data: {
        totalAssigned: students.length,
        summary: divisionSummary,
      },
    });
  } catch (error: any) {
    console.error('Division auto-assign error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

/**
 * GET /api/admin/divisions/overview/:electiveId
 * Returns division breakdown for a specific elective.
 */
export const getDivisionOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { electiveId } = req.params;

    const elective = await Elective.findById(electiveId).lean();
    if (!elective) {
      res.status(404).json({ success: false, message: 'Elective not found' });
      return;
    }

    const students = await Student.find({
      allocatedElectiveId: elective._id,
    })
      .select('firstName middleName lastName hallTicketNumber rollNumber branch year allocatedDivision allocatedFaculty allocatedHall')
      .lean();

    // Group by division
    const divisionBreakdown: Record<string, {
      students: typeof students;
      departments: Record<string, number>;
    }> = {};

    for (const s of students) {
      const divName = s.allocatedDivision || 'Unassigned';
      if (!divisionBreakdown[divName]) {
        divisionBreakdown[divName] = { students: [], departments: {} };
      }
      divisionBreakdown[divName].students.push(s);
      const dept = s.branch || 'Other';
      divisionBreakdown[divName].departments[dept] =
        (divisionBreakdown[divName].departments[dept] || 0) + 1;
    }

    res.json({
      success: true,
      data: {
        elective: {
          _id: elective._id,
          name: elective.name,
          code: elective.code,
          divisions: elective.divisions,
        },
        totalStudents: students.length,
        breakdown: divisionBreakdown,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

/**
 * POST /api/admin/divisions/reassign
 * Manually reassign a single student to a different division.
 * Body: { studentId, divisionName, electiveId }
 */
export const reassignDivision = async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentId, divisionName, electiveId } = req.body;

    if (!studentId || !divisionName || !electiveId) {
      res.status(400).json({
        success: false,
        message: 'studentId, divisionName, and electiveId are required',
      });
      return;
    }

    const elective = await Elective.findById(electiveId).lean();
    if (!elective) {
      res.status(404).json({ success: false, message: 'Elective not found' });
      return;
    }

    const division = elective.divisions?.find((d) => d.divisionName === divisionName);
    if (!division) {
      res.status(400).json({ success: false, message: `Division "${divisionName}" not found in this elective` });
      return;
    }

    const student = await Student.findOneAndUpdate(
      { _id: studentId, allocatedElectiveId: elective._id },
      {
        $set: {
          allocatedDivision: division.divisionName,
          allocatedFaculty: division.facultyName,
          allocatedFacultyPhone: division.facultyContact || '',
          allocatedFacultyContact: division.facultyContact || '',
          allocatedHall: division.hallRoom || '',
        },
      },
      { new: true, lean: true }
    );

    if (!student) {
      res.status(404).json({
        success: false,
        message: 'Student not found or not allocated to this elective',
      });
      return;
    }

    await logAudit({
      action: 'DIVISION_MANUAL_REASSIGN',
      actorId: req.user?.userId || 'admin',
      actorRole: 'admin',
      targetType: 'student',
      targetId: studentId,
      metadata: { electiveId, newDivision: divisionName },
    });

    res.json({
      success: true,
      message: `Student reassigned to ${divisionName}`,
      data: student,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};
