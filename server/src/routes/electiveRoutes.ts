import { Router } from 'express';
import { getElectives, getElectiveById, createElective, updateElective, deleteElective } from '../controllers/electiveController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, getElectives);
router.get('/:id', authenticateToken, getElectiveById);
router.post('/', authenticateToken, authorizeRoles('admin'), createElective);
router.put('/:id', authenticateToken, authorizeRoles('admin'), updateElective);
router.delete('/:id', authenticateToken, authorizeRoles('admin'), deleteElective);

export default router;
