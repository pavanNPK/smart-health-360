import mongoose, { Schema, Document, Model } from 'mongoose';

export type VisitType = 'NEW' | 'FOLLOWUP' | 'CONTINUATION';

export interface IVisitRecord extends Document {
  patientId: mongoose.Types.ObjectId;
  visitType: VisitType;
  visitedAt: Date;
  diseaseSummary?: string;
  diagnosis?: string;
  treatedByDoctorId?: mongoose.Types.ObjectId;
  prescribedMedicinesSummary?: string;
  notes?: string;
  createdByRole: 'RECEPTIONIST' | 'DOCTOR' | 'SUPER_ADMIN';
  createdByUserId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const VisitRecordSchema = new Schema<IVisitRecord>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    visitType: { type: String, enum: ['NEW', 'FOLLOWUP', 'CONTINUATION'], required: true },
    visitedAt: { type: Date, required: true },
    diseaseSummary: { type: String },
    diagnosis: { type: String },
    treatedByDoctorId: { type: Schema.Types.ObjectId, ref: 'User' },
    prescribedMedicinesSummary: { type: String },
    notes: { type: String },
    createdByRole: { type: String, enum: ['RECEPTIONIST', 'DOCTOR', 'SUPER_ADMIN'], required: true },
    createdByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

VisitRecordSchema.index({ patientId: 1, visitedAt: -1 });
VisitRecordSchema.index({ visitType: 1 });

export const VisitRecord: Model<IVisitRecord> = mongoose.model<IVisitRecord>('VisitRecord', VisitRecordSchema);
