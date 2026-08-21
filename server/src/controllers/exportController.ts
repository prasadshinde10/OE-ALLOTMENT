import { Request, Response } from 'express';
import exceljs from 'exceljs';
import Student from '../models/Student';
import Elective from '../models/Elective';

export const exportStudents = async (req: Request, res: Response): Promise<void> => {
  try {
    const filter = req.query;
    const students = await Student.find(filter);

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Students');

    worksheet.columns = [
      { header: 'Hall Ticket Number', key: 'hallTicketNumber', width: 20 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Email', key: 'instituteEmail', width: 30 },
      { header: 'Mobile', key: 'mobileNumber', width: 15 },
      { header: 'Class', key: 'class', width: 15 },
      { header: 'Roll Number', key: 'rollNumber', width: 15 },
      { header: 'Year', key: 'year', width: 10 },
      { header: 'Verified', key: 'isVerified', width: 10 },
      { header: 'Allocated Elective', key: 'allocatedElectiveName', width: 30 },
      { header: 'Allocated Term', key: 'allocatedTerm', width: 15 },
    ];

    students.forEach(student => {
      worksheet.addRow(student);
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
    
    const filter: any = { year, isVerified: true, allocatedElectiveId: { $ne: null } };
    if (term) filter.allocatedTerm = term;

    const students = await Student.find(filter);

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet(`Allocations Year ${year}`);

    worksheet.columns = [
      { header: 'Hall Ticket Number', key: 'hallTicketNumber', width: 20 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Email', key: 'instituteEmail', width: 30 },
      { header: 'Allocated Elective', key: 'allocatedElectiveName', width: 30 },
      { header: 'Allocated Term', key: 'allocatedTerm', width: 15 },
      { header: 'Allocation Time', key: 'allocationTimestamp', width: 25 },
    ];

    students.forEach(student => {
      worksheet.addRow({
        hallTicketNumber: student.hallTicketNumber,
        name: student.name,
        instituteEmail: student.instituteEmail,
        allocatedElectiveName: student.allocatedElectiveName,
        allocatedTerm: student.allocatedTerm,
        allocationTimestamp: student.allocationTimestamp ? student.allocationTimestamp.toISOString() : ''
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
