import { Request, Response } from 'express';
import exceljs from 'exceljs';
import Student from '../models/Student';

export const exportStudents = async (req: Request, res: Response): Promise<void> => {
  try {
    const filter = req.query;
    const students = await Student.find(filter);

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Students');

    worksheet.columns = [
      { header: 'Hall Ticket Number', key: 'hallTicketNumber', width: 20 },
      { header: 'First Name', key: 'firstName', width: 20 },
      { header: 'Middle Name', key: 'middleName', width: 20 },
      { header: 'Last Name', key: 'lastName', width: 20 },
      { header: 'Email', key: 'instituteEmail', width: 30 },
      { header: 'Mobile', key: 'mobileNumber', width: 15 },
      { header: 'Branch', key: 'branch', width: 15 },
      { header: 'Semester', key: 'semester', width: 12 },
      { header: 'Roll Number', key: 'rollNumber', width: 15 },
      { header: 'Year', key: 'year', width: 10 },
      { header: 'Verified', key: 'isVerified', width: 10 },
      { header: 'Allocated Elective', key: 'allocatedElectiveName', width: 30 },
      { header: 'Allocated Semester', key: 'allocatedTerm', width: 18 },
    ];

    students.forEach((student: any) => {
      worksheet.addRow({
        hallTicketNumber: student.hallTicketNumber,
        firstName: student.firstName,
        middleName: student.middleName || '',
        lastName: student.lastName,
        instituteEmail: student.instituteEmail,
        mobileNumber: student.mobileNumber,
        branch: student.branch,
        semester: student.semester,
        rollNumber: student.rollNumber,
        year: student.year,
        isVerified: student.isVerified ? 'Yes' : 'No',
        allocatedElectiveName: student.allocatedElectiveName || 'None',
        allocatedTerm: student.allocatedTerm || 'None',
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=students.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

export const exportAllocations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { year } = req.params;
    const { term } = req.query;

    const filter: any = { year: Number(year), isVerified: true, allocatedElectiveId: { $ne: null } };
    if (term) filter.allocatedTerm = term;

    const students = await Student.find(filter);

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet(`Allocations Year ${year}`);

    worksheet.columns = [
      { header: 'Hall Ticket Number', key: 'hallTicketNumber', width: 20 },
      { header: 'First Name', key: 'firstName', width: 20 },
      { header: 'Middle Name', key: 'middleName', width: 20 },
      { header: 'Last Name', key: 'lastName', width: 20 },
      { header: 'Email', key: 'instituteEmail', width: 30 },
      { header: 'Branch', key: 'branch', width: 15 },
      { header: 'Semester', key: 'semester', width: 12 },
      { header: 'Allocated Elective', key: 'allocatedElectiveName', width: 30 },
      { header: 'Allocated Semester', key: 'allocatedTerm', width: 18 },
      { header: 'Allocation Time', key: 'allocationTimestamp', width: 25 },
    ];

    students.forEach((student: any) => {
      worksheet.addRow({
        hallTicketNumber: student.hallTicketNumber,
        firstName: student.firstName,
        middleName: student.middleName || '',
        lastName: student.lastName,
        instituteEmail: student.instituteEmail,
        branch: student.branch,
        semester: student.semester,
        allocatedElectiveName: student.allocatedElectiveName,
        allocatedTerm: student.allocatedTerm,
        allocationTimestamp: student.allocationTimestamp ? student.allocationTimestamp.toISOString() : '',
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=allocations_year_${year}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};
