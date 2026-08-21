import { Router } from 'express';
import { getDuplicates, rejectDuplicate, getAuditLog, createUser, getTermConfigs, createTermConfig, updateTermConfig } from '../controllers/adminController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

router.get('/duplicates', authenticateToken, authorizeRoles('admin'), getDuplicates);
router.post('/duplicates/:id/reject', authenticateToken, authorizeRoles('admin'), rejectDuplicate);
router.get('/audit-log', authenticateToken, authorizeRoles('admin'), getAuditLog);
router.post('/users', authenticateToken, authorizeRoles('admin'), createUser);
router.get('/term-configs', authenticateToken, authorizeRoles('admin'), getTermConfigs);
router.post('/term-configs', authenticateToken, authorizeRoles('admin'), createTermConfig);
router.put('/term-configs/:id', authenticateToken, authorizeRoles('admin'), updateTermConfig);

export default router;
