import { Request, Response } from 'express';
import Student from '../models/Student';
import Club from '../models/Club';
import { logAudit } from '../services/auditService';

const DEPARTMENT_PRIORITY = [
  'Computer Science and Engineering',
  'Computer Science and Design',
  'Artificial Intelligence and Data Science',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electronics and Telecommunication',
];

export const autoAssignClubDivisions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { clubId } = req.params;

    const club = await Club.findById(clubId);
    if (!club) {
      res.status(404).json({ success: false, message: 'Club not found' });
      return;
    }

    if (!club.divisions || club.divisions.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No divisions configured for this club. Please add divisions first.',
      });
      return;
    }

    const isCoCurricular = club.category === 'co-curricular';
    const filter = isCoCurricular
      ? { allocatedCoCurricularClubId: club._id }
      : { allocatedExtraCurricularClubId: club._id };

    const students = await Student.find(filter).lean();

    if (students.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No students are currently allocated to this club.',
      });
      return;
    }

    // Group students by department
    const departmentGroups: Map<string, typeof students> = new Map();
    for (const student of students) {
      const dept = student.branch || 'Other';
      if (!departmentGroups.has(dept)) {
        departmentGroups.set(dept, []);
      }
      departmentGroups.get(dept)!.push(student);
    }

    const sortedDepartments: string[] = [];
    for (const dept of DEPARTMENT_PRIORITY) {
      if (departmentGroups.has(dept)) {
        sortedDepartments.push(dept);
      }
    }

    const remainingDepts = Array.from(departmentGroups.keys())
      .filter((d) => !DEPARTMENT_PRIORITY.includes(d))
      .sort(
        (a, b) =>
          (departmentGroups.get(b)?.length || 0) - (departmentGroups.get(a)?.length || 0)
      );
    sortedDepartments.push(...remainingDepts);

    const orderedStudents: typeof students = [];
    for (const dept of sortedDepartments) {
      const group = departmentGroups.get(dept) || [];
      group.sort((a, b) => (a.rollNumber || '').localeCompare(b.rollNumber || ''));
      orderedStudents.push(...group);
    }

    const divisions = club.divisions;
    const assignments: Array<{
      studentId: string;
      divisionName: string;
      coordinatorName: string;
      coordinatorContact?: string;
      hallRoom: string;
    }> = [];

    let divisionIndex = 0;
    let filledInCurrentDivision = 0;

    for (const student of orderedStudents) {
      while (
        divisionIndex < divisions.length &&
        filledInCurrentDivision >= divisions[divisionIndex].capacity
      ) {
        divisionIndex++;
        filledInCurrentDivision = 0;
      }

      if (divisionIndex >= divisions.length) {
        const lastDiv = divisions[divisions.length - 1];
        assignments.push({
          studentId: student._id.toString(),
          divisionName: lastDiv.divisionName,
          coordinatorName: lastDiv.coordinatorName || lastDiv.facultyName || '',
          coordinatorContact: lastDiv.coordinatorContact || lastDiv.facultyContact || '',
          hallRoom: lastDiv.hallRoom || '',
        });
      } else {
        const div = divisions[divisionIndex];
        assignments.push({
          studentId: student._id.toString(),
          divisionName: div.divisionName,
          coordinatorName: div.coordinatorName || div.facultyName || '',
          coordinatorContact: div.coordinatorContact || div.facultyContact || '',
          hallRoom: div.hallRoom || '',
        });
        filledInCurrentDivision++;
      }
    }

    const bulkOps = assignments.map((a) => {
      const updateData: any = {};
      if (isCoCurricular) {
        updateData.allocatedCoCurricularDivision = a.divisionName;
        updateData.allocatedCoCurricularCoordinator = a.coordinatorName;
        updateData.allocatedCoCurricularContact = a.coordinatorContact;
        updateData.allocatedCoCurricularHall = a.hallRoom;
      } else {
        updateData.allocatedExtraCurricularDivision = a.divisionName;
        updateData.allocatedExtraCurricularCoordinator = a.coordinatorName;
        updateData.allocatedExtraCurricularContact = a.coordinatorContact;
        updateData.allocatedExtraCurricularHall = a.hallRoom;
      }

      return {
        updateOne: {
          filter: { _id: a.studentId },
          update: { $set: updateData },
        },
      };
    });

    await Student.bulkWrite(bulkOps);

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
      action: 'CLUB_DIVISION_AUTO_ASSIGN',
      actorId: (req as any).user?.userId || 'system',
      actorRole: 'first_year_admin',
      targetType: 'club',
      targetId: clubId,
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
    console.error('Club division auto-assign error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const getClubDivisionOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { clubId } = req.params;

    const club = await Club.findById(clubId).lean();
    if (!club) {
      res.status(404).json({ success: false, message: 'Club not found' });
      return;
    }

    const isCoCurricular = club.category === 'co-curricular';
    const filter = isCoCurricular
      ? { allocatedCoCurricularClubId: club._id }
      : { allocatedExtraCurricularClubId: club._id };

    const selectFields = isCoCurricular
      ? 'firstName middleName lastName hallTicketNumber rollNumber branch year allocatedCoCurricularDivision allocatedCoCurricularCoordinator allocatedCoCurricularHall'
      : 'firstName middleName lastName hallTicketNumber rollNumber branch year allocatedExtraCurricularDivision allocatedExtraCurricularCoordinator allocatedExtraCurricularHall';

    const students = await Student.find(filter).select(selectFields).lean();

    const divisionBreakdown: Record<
      string,
      {
        students: typeof students;
        departments: Record<string, number>;
      }
    > = {};

    for (const s of students) {
      const divName =
        (isCoCurricular ? s.allocatedCoCurricularDivision : s.allocatedExtraCurricularDivision) ||
        'Unassigned';
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
        club: {
          _id: club._id,
          name: club.name,
          code: club.code,
          category: club.category,
          divisions: club.divisions,
        },
        totalStudents: students.length,
        breakdown: divisionBreakdown,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const reassignClubDivision = async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentId, divisionName, clubId } = req.body;

    if (!studentId || !divisionName || !clubId) {
      res.status(400).json({
        success: false,
        message: 'studentId, divisionName, and clubId are required',
      });
      return;
    }

    const club = await Club.findById(clubId).lean();
    if (!club) {
      res.status(404).json({ success: false, message: 'Club not found' });
      return;
    }

    const division = club.divisions?.find((d) => d.divisionName === divisionName);
    if (!division) {
      res.status(400).json({
        success: false,
        message: `Division "${divisionName}" not found in this club`,
      });
      return;
    }

    const isCoCurricular = club.category === 'co-curricular';
    const query = isCoCurricular
      ? { _id: studentId, allocatedCoCurricularClubId: club._id }
      : { _id: studentId, allocatedExtraCurricularClubId: club._id };

    const updateData: any = {};
    if (isCoCurricular) {
      updateData.allocatedCoCurricularDivision = division.divisionName;
      updateData.allocatedCoCurricularCoordinator =
        division.coordinatorName || division.facultyName || '';
      updateData.allocatedCoCurricularContact =
        division.coordinatorContact || division.facultyContact || '';
      updateData.allocatedCoCurricularHall = division.hallRoom || '';
    } else {
      updateData.allocatedExtraCurricularDivision = division.divisionName;
      updateData.allocatedExtraCurricularCoordinator =
        division.coordinatorName || division.facultyName || '';
      updateData.allocatedExtraCurricularContact =
        division.coordinatorContact || division.facultyContact || '';
      updateData.allocatedExtraCurricularHall = division.hallRoom || '';
    }

    const student = await Student.findOneAndUpdate(query, { $set: updateData }, {
      new: true,
      lean: true,
    });

    if (!student) {
      res.status(404).json({
        success: false,
        message: 'Student not found or not allocated to this club',
      });
      return;
    }

    await logAudit({
      action: 'CLUB_DIVISION_MANUAL_REASSIGN',
      actorId: (req as any).user?.userId || 'system',
      actorRole: 'first_year_admin',
      targetType: 'student',
      targetId: studentId,
      metadata: { clubId, newDivision: divisionName, category: club.category },
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
