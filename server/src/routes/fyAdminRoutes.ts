import { Router } from 'express';
import {
  getFYStats,
  getFYStudents,
  exportFYClubCSV,
  exportFYAllClubsZip,
  getFYTermConfigs,
  createFYTermConfig,
  updateFYTermConfig,
  getFYBranches,
  createFYBranch,
  deleteFYBranch,
} from '../controllers/fyAdminController';
import {
  autoAssignClubDivisions,
  getClubDivisionOverview,
  reassignClubDivision,
} from '../controllers/clubDivisionController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

// Restrict all FY Admin endpoints to 'admin' and 'first_year_admin'
router.use(authenticateToken, authorizeRoles('admin', 'first_year_admin'));

router.get('/stats', getFYStats);
router.get('/students', getFYStudents);
router.get('/export', exportFYClubCSV);
router.get('/export-all', exportFYAllClubsZip);

// Scoped Term Configs for First-Year
router.get('/term-configs', getFYTermConfigs);
router.post('/term-configs', createFYTermConfig);
router.put('/term-configs/:id', updateFYTermConfig);

// Scoped Branches for First-Year
router.get('/branches', getFYBranches);
router.post('/branches', createFYBranch);
router.delete('/branches/:id', deleteFYBranch);

// Club Division Management
router.post('/divisions/auto-assign/:clubId', autoAssignClubDivisions);
router.get('/divisions/overview/:clubId', getClubDivisionOverview);
router.post('/divisions/reassign', reassignClubDivision);

export default router;
