import { Router } from 'express';
import { allocateElective, getMyStatus, getMyTermConfig, getSeatCounts } from '../controllers/allocationController';
import { authenticateToken, authorizeRoles, requireVerified } from '../middleware/auth';
import { allocationRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/allocate', authenticateToken, authorizeRoles('student'), requireVerified, allocationRateLimiter, allocateElective);
router.get('/my-status', authenticateToken, authorizeRoles('student'), getMyStatus);
router.get('/my-term-config', authenticateToken, authorizeRoles('student'), getMyTermConfig);
router.get('/seat-counts/:year', authenticateToken, getSeatCounts);
router.get('/seats/:year', authenticateToken, getSeatCounts);

export default router;
