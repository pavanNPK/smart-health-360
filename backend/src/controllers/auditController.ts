import mongoose from 'mongoose';
import { Request, Response } from 'express';
import { AuditLog } from '../models/AuditLog';
import { User } from '../models/User';
import { AuthUser } from '../middleware/auth';

export async function listAuditLogs(req: Request, res: Response): Promise<void> {
  const user = req.user! as AuthUser;
  const action = req.query.action as string | undefined;
  const userIdQuery = req.query.userId as string | undefined;
  const patientId = req.query.patientId as string | undefined;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;
  const filter: Record<string, unknown> = {};
  if (action) filter.action = action;
  if (patientId) filter.patientId = patientId;

  // Scope by role: SA sees all; Doctor sees self + clinic receptionists; Receptionist sees self only
  if (user.role === 'SUPER_ADMIN') {
    if (userIdQuery) filter.userId = userIdQuery;
  } else if (user.role === 'DOCTOR' && user.clinicId) {
    let clinicObjectId: mongoose.Types.ObjectId | null = null;
    try {
      clinicObjectId = new mongoose.Types.ObjectId(user.clinicId);
    } catch {
      // invalid clinicId string; fall back to self-only below
    }
    const receptionistIds = clinicObjectId
      ? await User.find({ role: 'RECEPTIONIST', clinicId: clinicObjectId }).distinct('_id')
      : [];
    const allowedUserIds = [user.id, ...receptionistIds.map((id) => id.toString())];
    filter.userId = { $in: allowedUserIds };
  } else {
    filter.userId = user.id;
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter).populate('userId', 'name email role').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(filter),
  ]);
  res.json({ data: logs, total, page, limit });
}
