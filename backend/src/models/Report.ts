import mongoose, { Schema, Document, Model } from 'mongoose';

export type RecordVisibility = 'PUBLIC' | 'PRIVATE';

export interface IReport extends Document {
  patientId: mongoose.Types.ObjectId;
  recordId?: mongoose.Types.ObjectId;
  uploadedBy: mongoose.Types.ObjectId;
  visibility: RecordVisibility;
  fileName: string;
  mimeType: string;
  size: number;
  storageProvider: 'S3' | 'GRIDFS' | 'LOCAL';
  storageKey: string;
  reportType?: string;
  labName?: string;
  reportDate?: Date;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    recordId: { type: Schema.Types.ObjectId, ref: 'Record' },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    visibility: { type: String, enum: ['PUBLIC', 'PRIVATE'], required: true },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    storageProvider: { type: String, enum: ['S3', 'GRIDFS', 'LOCAL'], default: 'LOCAL' },
    storageKey: { type: String, required: true },
    reportType: { type: String },
    labName: { type: String },
    reportDate: { type: Date },
    description: { type: String },
  },
  { timestamps: true }
);

ReportSchema.index({ patientId: 1 });
ReportSchema.index({ patientId: 1, visibility: 1 });
ReportSchema.index({ reportDate: -1 });

export const Report: Model<IReport> = mongoose.model<IReport>('Report', ReportSchema);
