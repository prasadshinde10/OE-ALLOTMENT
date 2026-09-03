import { Router } from 'express';
import {
  allocateClub,
  getMyClubStatus,
  getClubSeatCounts,
  getMyClubTermConfig,
} from '../controllers/clubAllocationController';
import { authenticateToken, authorizeRoles, requireVerified } from '../middleware/auth';
import { allocationRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/allocate', authenticateToken, authorizeRoles('student'), requireVerified, allocationRateLimiter, allocateClub);
router.get('/my-status', authenticateToken, authorizeRoles('student'), getMyClubStatus);
router.get('/my-term-config', authenticateToken, authorizeRoles('student'), getMyClubTermConfig);
router.get('/seat-counts', authenticateToken, getClubSeatCounts);

export default router;
