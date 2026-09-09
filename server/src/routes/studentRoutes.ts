import { Router } from 'express';
import { getStudents, getStudentById, updateStudent, reassignElective, deleteStudent } from '../controllers/studentController';
import { updateMyProfile } from '../controllers/profileController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { checkRegistrationPhase } from '../middleware/registrationPhase';
import TermConfig from '../models/TermConfig';

const router = Router();

// Student self-profile management (protected by registration phase lock)
router.put('/profile', authenticateToken, checkRegistrationPhase, updateMyProfile);

// Public/student-accessible registration phase status
router.get('/registration-phase', async (req, res) => {
  try {
    const year = Number(req.query.year) || 1;
    const config = await TermConfig.findOne({ year, isActive: true }).sort({ updatedAt: -1 });
    const now = Date.now();
    const isRegistrationActive = config ? config.isRegistrationActive !== false : true;
    let isWithinDates = true;
    if (config?.registrationStartDate || config?.registrationEndDate) {
      const start = config.registrationStartDate ? new Date(config.registrationStartDate).getTime() : 0;
      const end = config.registrationEndDate ? new Date(config.registrationEndDate).getTime() : Infinity;
      isWithinDates = now >= start && now <= end;
    }
    const isPhaseActive = Boolean(config && isRegistrationActive && isWithinDates);
    res.status(200).json({
      success: true,
      data: {
        isRegistrationActive,
        registrationStartDate: config?.registrationStartDate || null,
        registrationEndDate: config?.registrationEndDate || null,
        isPhaseActive,
        term: config?.term || 'Sem-1',
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

// Admin student management
router.get('/', authenticateToken, authorizeRoles('admin', 'teacher'), getStudents);
router.get('/:id', authenticateToken, authorizeRoles('admin', 'teacher'), getStudentById);
router.put('/:id', authenticateToken, authorizeRoles('admin'), updateStudent);
router.post('/:id/reassign', authenticateToken, authorizeRoles('admin'), reassignElective);
router.delete('/:id', authenticateToken, authorizeRoles('admin'), deleteStudent);

export default router;
