import { AuditLog } from '../models/AuditLog';
import type { AuditAction } from '../models/AuditLog';
import mongoose from 'mongoose';

const OBJECT_ID_HEX = /^[a-f0-9]{24}$/i;

function toObjectId(s: string | undefined): mongoose.Types.ObjectId | undefined {
  if (!s || typeof s !== 'string' || !OBJECT_ID_HEX.test(s)) return undefined;
  return new mongoose.Types.ObjectId(s);
}

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
  const uid = toObjectId(userId);
  if (!uid) {
    console.warn('logAudit: invalid userId, skipping', { action, userId: typeof userId });
    return;
  }
  await AuditLog.create({
    action,
    userId: uid,
    patientId: toObjectId(options?.patientId),
    recordId: toObjectId(options?.recordId),
    importSessionId: toObjectId(options?.importSessionId),
    details: options?.details,
  });
}
