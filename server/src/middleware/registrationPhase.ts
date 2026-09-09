import { Request, Response, NextFunction } from 'express';
import TermConfig from '../models/TermConfig';
import Student from '../models/Student';

/**
 * Middleware to ensure student registration / profile editing is currently active.
 * Checks whether isRegistrationActive is true, and if registration dates are set,
 * validates that current server timestamp falls within [registrationStartDate, registrationEndDate].
 */
export const checkRegistrationPhase = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as any).user;

    // Administrative roles bypass the registration window restriction
    if (user && ['admin', 'first_year_admin', 'FY_ADMIN', 'SUPER_ADMIN', 'teacher'].includes(user.role)) {
      return next();
    }

    // Determine target year (defaults to FY Year 1 if not specified)
    let year = user?.year;
    if (!year && user?.userId) {
      const student = await Student.findById(user.userId).select('year');
      year = student?.year;
    }
    const targetYear = Number(year) || 1;

    // Fetch active term configuration for this year
    const termConfig = await TermConfig.findOne({ year: targetYear, isActive: true })
      .sort({ updatedAt: -1 });

    // If no term config exists or isRegistrationActive is explicitly false
    if (!termConfig || termConfig.isRegistrationActive === false) {
      res.status(403).json({
        success: false,
        message: 'Profile editing is currently locked by FY Admin.',
      });
      return;
    }

    // If date boundaries are set, enforce strict time window
    const now = Date.now();
    const hasStartDate = Boolean(termConfig.registrationStartDate);
    const hasEndDate = Boolean(termConfig.registrationEndDate);

    if (hasStartDate || hasEndDate) {
      const start = hasStartDate ? new Date(termConfig.registrationStartDate!).getTime() : 0;
      const end = hasEndDate ? new Date(termConfig.registrationEndDate!).getTime() : Infinity;

      if (now < start || now > end) {
        res.status(403).json({
          success: false,
          message: 'Profile editing is currently locked by FY Admin.',
        });
        return;
      }
    }

    next();
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error verifying registration phase',
    });
  }
};
