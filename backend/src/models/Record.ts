import mongoose, { Schema, Document, Model } from 'mongoose';

export type RecordVisibility = 'PUBLIC' | 'PRIVATE';
export type RecordType = 'diagnosis' | 'medication' | 'report' | 'note' | 'lab' | 'attachment';

export interface IRecord extends Document {
  patientId: mongoose.Types.ObjectId;
  encounterId?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  assignedDoctorId?: mongoose.Types.ObjectId;
  visibility: RecordVisibility;
  type: RecordType;
  title?: string;
  description?: string;
  disease?: string;
  diagnosisRound?: number;
  place?: string;
  medications?: Array<{ name: string; dosage: string; frequency: string; duration?: string }>;
  notes?: string;
  reportId?: mongoose.Types.ObjectId;
  version?: number;
  previousVersionId?: mongoose.Types.ObjectId;
  importSessionId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RecordSchema = new Schema<IRecord>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    encounterId: { type: Schema.Types.ObjectId, ref: 'Encounter' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedDoctorId: { type: Schema.Types.ObjectId, ref: 'User' },
    visibility: { type: String, enum: ['PUBLIC', 'PRIVATE'], required: true },
    type: { type: String, enum: ['diagnosis', 'medication', 'report', 'note', 'lab', 'attachment'], required: true },
    title: { type: String },
    description: { type: String },
    disease: { type: String },
    diagnosisRound: { type: Number },
    place: { type: String },
    medications: [{
      name: String,
      dosage: String,
      frequency: String,
      duration: String,
    }],
    notes: { type: String },
    reportId: { type: Schema.Types.ObjectId, ref: 'Report' },
    version: { type: Number },
    previousVersionId: { type: Schema.Types.ObjectId },
    importSessionId: { type: Schema.Types.ObjectId, ref: 'ImportSession' },
  },
  { timestamps: true }
);

RecordSchema.index({ patientId: 1 });
RecordSchema.index({ patientId: 1, visibility: 1 });
RecordSchema.index({ assignedDoctorId: 1, visibility: 1 });
RecordSchema.index({ type: 1 });
RecordSchema.index({ createdAt: -1 });

export const Record: Model<IRecord> = mongoose.model<IRecord>('Record', RecordSchema);
