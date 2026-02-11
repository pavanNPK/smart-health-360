import mongoose, { Schema, Document, Model } from 'mongoose';
import type { RecordVisibility, RecordType } from './Record';

export interface IRecordVault extends Document {
  _originalId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  visibility: RecordVisibility;
  type: RecordType;
  createdBy: mongoose.Types.ObjectId;
  assignedDoctorId?: mongoose.Types.ObjectId;
  title?: string;
  description?: string;
  disease?: string;
  notes?: string;
  _movedAt: Date;
  _movedBy: mongoose.Types.ObjectId;
  [key: string]: unknown;
}

const RecordVaultSchema = new Schema<IRecordVault>(
  {
    _originalId: { type: Schema.Types.ObjectId, required: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    visibility: { type: String, enum: ['VIS_A', 'VIS_B'], required: true },
    type: { type: String, enum: ['diagnosis', 'medication', 'report', 'note', 'lab', 'attachment'], required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedDoctorId: { type: Schema.Types.ObjectId, ref: 'User' },
    title: String,
    description: String,
    disease: String,
    notes: String,
    _movedAt: { type: Date, default: Date.now },
    _movedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { collection: 'records_secure_vault', timestamps: false }
);

RecordVaultSchema.index({ _originalId: 1 });
RecordVaultSchema.index({ patientId: 1 });

export const RecordVault: Model<IRecordVault> = mongoose.model<IRecordVault>('RecordVault', RecordVaultSchema);
