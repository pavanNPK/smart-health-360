import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthUser {
  id: string;
  role: 'RECEPTIONIST' | 'DOCTOR' | 'SUPER_ADMIN';
  email?: string;
  clinicId?: string;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthUser & { exp: number };
    req.user = { id: payload.id, role: payload.role, email: payload.email, clinicId: payload.clinicId };
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
}

export function roleGuard(...allowedRoles: AuthUser['role'][]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    if (allowedRoles.includes(req.user.role)) {
      next();
      return;
    }
    res.status(403).json({ message: 'Forbidden' });
  };
}
