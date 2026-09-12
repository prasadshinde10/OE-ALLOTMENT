import { Router } from 'express';
import {
  getStats,
  getDuplicates,
  rejectDuplicate,
  getAuditLog,
  createUser,
  getTermConfigs,
  createTermConfig,
  updateTermConfig,
  createBranch,
  getBranches,
  deleteBranch,
  getDepartmentOverview,
  exportDepartmentCSV,
  exportAllDepartmentsZip,
} from '../controllers/adminController';
import {
  autoAssignDivisions,
  getDivisionOverview,
  reassignDivision,
} from '../controllers/divisionController';
import { deleteStudent, deleteAllOEStudents } from '../controllers/studentController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

// All admin routes require authenticated admin or FY Admin role
router.use(authenticateToken, authorizeRoles('admin', 'first_year_admin', 'FY_ADMIN'));

router.get('/stats', getStats);
router.get('/duplicates', getDuplicates);
router.post('/duplicates/:id/reject', rejectDuplicate);
router.get('/audit-log', getAuditLog);
router.post('/users', createUser);
router.get('/term-configs', getTermConfigs);
router.get('/term-config', getTermConfigs);
router.post('/term-configs', createTermConfig);
router.post('/term-config', createTermConfig);
router.put('/term-configs/:id', updateTermConfig);
router.put('/term-config/:id', updateTermConfig);

// Branch management
router.post('/branches', createBranch);
router.get('/branches', getBranches);
router.delete('/branches/:id', deleteBranch);

// Division management
router.post('/divisions/auto-assign/:electiveId', autoAssignDivisions);
router.get('/divisions/overview/:electiveId', getDivisionOverview);
router.post('/divisions/reassign', reassignDivision);

// Department overview & export
router.get('/department-overview', getDepartmentOverview);
router.get('/department-overview/export', exportDepartmentCSV);
router.get('/department-overview/export-all', exportAllDepartmentsZip);

// Student deletion (single & bulk purge)
router.delete('/students/delete-all', deleteAllOEStudents);
router.delete('/students/:id', deleteStudent);

export default router;
