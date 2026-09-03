import { Router } from 'express';
import {
  getClubs,
  getClubById,
  createClub,
  updateClub,
  deleteClub,
} from '../controllers/clubController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, getClubs);
router.get('/:id', authenticateToken, getClubById);
router.post('/', authenticateToken, authorizeRoles('admin', 'first_year_admin', 'FY_ADMIN'), createClub);
router.put('/:id', authenticateToken, authorizeRoles('admin', 'first_year_admin', 'FY_ADMIN'), updateClub);
router.delete('/:id', authenticateToken, authorizeRoles('admin', 'first_year_admin', 'FY_ADMIN'), deleteClub);

export default router;
