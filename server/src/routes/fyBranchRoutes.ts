import { Router } from 'express';
import {
  getFYBranches,
  createFYBranch,
  updateFYBranch,
  deleteFYBranch,
} from '../controllers/fyAdminController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

// GET /api/fy-branches (Publicly readable for registration/profile drop-downs)
router.get('/', getFYBranches);

// Protected Admin mutations for FY Branches
router.post(
  '/',
  authenticateToken,
  authorizeRoles('admin', 'first_year_admin', 'FY_ADMIN'),
  createFYBranch
);

router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('admin', 'first_year_admin', 'FY_ADMIN'),
  updateFYBranch
);

router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('admin', 'first_year_admin', 'FY_ADMIN'),
  deleteFYBranch
);

export default router;
