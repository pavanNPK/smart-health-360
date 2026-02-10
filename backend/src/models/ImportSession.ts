import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IImportSession extends Document {
  patientId: mongoose.Types.ObjectId;
  initiatedBy: mongoose.Types.ObjectId;
  fileName: string;
  totalItems: number;
  successCount: number;
  failureCount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  importErrors?: Array<{ row: number; message: string }>;
  createdAt: Date;
  completedAt?: Date;
}

const ImportSessionSchema = new Schema<IImportSession>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    initiatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    fileName: { type: String, required: true },
    totalItems: { type: Number, required: true },
    successCount: { type: Number, default: 0 },
    failureCount: { type: Number, default: 0 },
    status: { type: String, enum: ['PENDING', 'COMPLETED', 'FAILED'], default: 'PENDING' },
    importErrors: [{ row: Number, message: String }],
    completedAt: { type: Date },
  },
  { timestamps: true }
);

ImportSessionSchema.index({ patientId: 1 });
ImportSessionSchema.index({ initiatedBy: 1 });
ImportSessionSchema.index({ createdAt: -1 });

export const ImportSession: Model<IImportSession> = mongoose.model<IImportSession>('ImportSession', ImportSessionSchema);
