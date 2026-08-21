import { Router } from 'express';
import { allocateElective, getMyStatus, getSeatCounts } from '../controllers/allocationController';
import { authenticateToken, authorizeRoles, requireVerified } from '../middleware/auth';
import { allocationRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/allocate', authenticateToken, authorizeRoles('student'), requireVerified, allocationRateLimiter, allocateElective);
router.get('/my-status', authenticateToken, authorizeRoles('student'), getMyStatus);
router.get('/seat-counts/:year', authenticateToken, getSeatCounts);

export default router;
