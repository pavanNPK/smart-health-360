import { AuditLog } from '../models/AuditLog';
import type { AuditAction } from '../models/AuditLog';
import mongoose from 'mongoose';

export async function logAudit(
  action: AuditAction,
  userId: string,
  options?: {
    patientId?: string;
    recordId?: string;
    importSessionId?: string;
    details?: Record<string, unknown>;
  }
): Promise<void> {
  await AuditLog.create({
    action,
    userId: new mongoose.Types.ObjectId(userId),
    patientId: options?.patientId ? new mongoose.Types.ObjectId(options.patientId) : undefined,
    recordId: options?.recordId ? new mongoose.Types.ObjectId(options.recordId) : undefined,
    importSessionId: options?.importSessionId ? new mongoose.Types.ObjectId(options.importSessionId) : undefined,
    details: options?.details,
  });
}
