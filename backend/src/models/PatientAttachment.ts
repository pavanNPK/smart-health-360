import mongoose, { Schema, Document, Model } from 'mongoose';

export type AttachmentCategory = 'MEDICINE' | 'XRAY' | 'LAB_REPORT' | 'SCAN' | 'OTHER';

export interface IPatientAttachment extends Document {
  patientId: mongoose.Types.ObjectId;
  category: AttachmentCategory;
  name: string;
  description?: string;
  /** URL or path to file; placeholder if file storage not integrated. */
  fileUrl?: string;
  /** Optional reference to prescription or visit record. */
  prescriptionId?: mongoose.Types.ObjectId;
  visitRecordId?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdByRole: 'RECEPTIONIST' | 'DOCTOR' | 'SUPER_ADMIN';
  createdAt: Date;
  updatedAt: Date;
}

const PatientAttachmentSchema = new Schema<IPatientAttachment>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    category: {
      type: String,
      enum: ['MEDICINE', 'XRAY', 'LAB_REPORT', 'SCAN', 'OTHER'],
      required: true,
    },
    name: { type: String, required: true },
    description: { type: String },
    fileUrl: { type: String },
    prescriptionId: { type: Schema.Types.ObjectId, ref: 'Prescription' },
    visitRecordId: { type: Schema.Types.ObjectId, ref: 'VisitRecord' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdByRole: { type: String, enum: ['RECEPTIONIST', 'DOCTOR', 'SUPER_ADMIN'], required: true },
  },
  { timestamps: true }
);

PatientAttachmentSchema.index({ patientId: 1, createdAt: -1 });
PatientAttachmentSchema.index({ category: 1 });

export const PatientAttachment: Model<IPatientAttachment> = mongoose.model<IPatientAttachment>(
  'PatientAttachment',
  PatientAttachmentSchema
);
