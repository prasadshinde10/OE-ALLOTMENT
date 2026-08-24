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
} from '../controllers/adminController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

// All admin routes require authenticated admin role
router.use(authenticateToken, authorizeRoles('admin'));

router.get('/stats', getStats);
router.get('/duplicates', getDuplicates);
router.post('/duplicates/:id/reject', rejectDuplicate);
router.get('/audit-log', getAuditLog);
router.post('/users', createUser);
router.get('/term-configs', getTermConfigs);
router.post('/term-configs', createTermConfig);
router.put('/term-configs/:id', updateTermConfig);

// Branch management
router.post('/branches', createBranch);
router.get('/branches', getBranches);
router.delete('/branches/:id', deleteBranch);

export default router;
