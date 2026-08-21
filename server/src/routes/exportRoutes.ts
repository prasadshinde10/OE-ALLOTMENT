import { Router } from 'express';
import { exportStudents, exportAllocations } from '../controllers/exportController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

router.get('/students', authenticateToken, authorizeRoles('admin', 'teacher'), exportStudents);
router.get('/allocations/:year', authenticateToken, authorizeRoles('admin', 'teacher'), exportAllocations);

export default router;
