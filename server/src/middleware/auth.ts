import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { Student } from '../models/Student';

export interface JwtPayload {
  userId: string;
  role: string;
  year?: number;
}

declare global {
  namespace Express {
    // Extend Passport's User interface so req.user is compatible with both Passport and our JWT payload
    interface User extends JwtPayload {}
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ message: 'Access denied. No token provided.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ message: 'Invalid or expired token.' });
  }
};

export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !req.user.role) {
      res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
      return;
    }

    const userRole = req.user.role;
    const isAuthorized = roles.some((role) => {
      if (role === userRole) return true;
      if (role.toLowerCase() === userRole.toLowerCase()) return true;
      // FY_ADMIN and first_year_admin aliases
      if (
        (role === 'first_year_admin' || role === 'FY_ADMIN') &&
        (userRole === 'first_year_admin' || userRole === 'FY_ADMIN')
      ) {
        return true;
      }
      // ADMIN and SUPER_ADMIN aliases
      if (
        (role === 'admin' || role === 'ADMIN' || role === 'SUPER_ADMIN') &&
        (userRole === 'admin' || userRole === 'ADMIN' || userRole === 'SUPER_ADMIN')
      ) {
        return true;
      }
      return false;
    });

    if (!isAuthorized) {
      res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
      return;
    }
    next();
  };
};

export const requireVerified = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'student') {
      res.status(403).json({ message: 'Only students can access this route.' });
      return;
    }

    const student = await Student.findById(req.user.userId);
    if (!student) {
      res.status(404).json({ message: 'Student not found.' });
      return;
    }

    if (!student.isVerified) {
      res.status(403).json({ message: 'Student account is not verified.' });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};
