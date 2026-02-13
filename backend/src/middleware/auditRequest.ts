import { Request, Response, NextFunction } from 'express';
import { logAudit } from '../services/audit';

/** Paths we skip for request audit (noise or no user). */
const SKIP_PATHS = new Set(['/health', '/auth/login', '/auth/refresh', '/auth/send-otp', '/auth/verify-otp']);

/**
 * Logs every authenticated API request (method, path, status) for full audit trail.
 * Attaches to res.on('finish') so it runs after the route; only logs when req.user is set.
 */
export function auditRequestMiddleware(req: Request, res: Response, next: NextFunction): void {
  res.on('finish', () => {
    const user = (req as Request & { user?: { id: string; role: string } }).user;
    if (!user?.id) return;
    if (SKIP_PATHS.has(req.path)) return;
    if (req.method === 'OPTIONS') return;

    const method = req.method;
    const path = req.path;
    const statusCode = res.statusCode;

    logAudit('API_ACCESS', user.id, {
      details: {
        method,
        path,
        statusCode,
        role: user.role,
      },
    }).catch((err) => console.error('audit log failed', err));
  });
  next();
}
