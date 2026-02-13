import mongoose, { Schema, Document, Model } from 'mongoose';

export type AuditAction =
  | 'VIEW_PRIVATE_RECORD'
  | 'MOVE_VISIBILITY'
  | 'EXPORT_RECORDS'
  | 'IMPORT_RECORDS'
  | 'BREAK_GLASS_ACCESS'
  | 'LOGIN'
  | 'EMERGENCY_HIDE'
  | 'EMERGENCY_RESTORE'
  | 'API_ACCESS';

export interface IAuditLog extends Document {
  action: AuditAction;
  userId: mongoose.Types.ObjectId;
  patientId?: mongoose.Types.ObjectId;
  recordId?: mongoose.Types.ObjectId;
  importSessionId?: mongoose.Types.ObjectId;
  details?: Record<string, unknown>;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: { type: String, enum: ['VIEW_PRIVATE_RECORD', 'MOVE_VISIBILITY', 'EXPORT_RECORDS', 'IMPORT_RECORDS', 'BREAK_GLASS_ACCESS', 'LOGIN', 'EMERGENCY_HIDE', 'EMERGENCY_RESTORE', 'API_ACCESS'], required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient' },
    recordId: { type: Schema.Types.ObjectId, ref: 'Record' },
    importSessionId: { type: Schema.Types.ObjectId, ref: 'ImportSession' },
    details: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ userId: 1 });
AuditLogSchema.index({ patientId: 1 });
AuditLogSchema.index({ createdAt: -1 });

export const AuditLog: Model<IAuditLog> = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
