import { Router } from 'express';
import { getStudents, getStudentById, updateStudent, reassignElective, deleteStudent } from '../controllers/studentController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, authorizeRoles('admin', 'teacher'), getStudents);
router.get('/:id', authenticateToken, authorizeRoles('admin', 'teacher'), getStudentById);
router.put('/:id', authenticateToken, authorizeRoles('admin'), updateStudent);
router.post('/:id/reassign', authenticateToken, authorizeRoles('admin'), reassignElective);
router.delete('/:id', authenticateToken, authorizeRoles('admin'), deleteStudent);

export default router;
