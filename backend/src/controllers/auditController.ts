import { Request, Response } from 'express';
import { AuditLog } from '../models/AuditLog';

export async function listAuditLogs(req: Request, res: Response): Promise<void> {
  const action = req.query.action as string | undefined;
  const userId = req.query.userId as string | undefined;
  const patientId = req.query.patientId as string | undefined;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;
  const filter: Record<string, unknown> = {};
  if (action) filter.action = action;
  if (userId) filter.userId = userId;
  if (patientId) filter.patientId = patientId;
  const [logs, total] = await Promise.all([
    AuditLog.find(filter).populate('userId', 'name email role').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(filter),
  ]);
  res.json({ data: logs, total, page, limit });
}
