import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEncounter extends Document {
  patientId: mongoose.Types.ObjectId;
  primaryDoctorId?: mongoose.Types.ObjectId;
  visitDate: Date;
  reason?: string;
  location?: string;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EncounterSchema = new Schema<IEncounter>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    primaryDoctorId: { type: Schema.Types.ObjectId, ref: 'User' },
    visitDate: { type: Date, required: true },
    reason: { type: String },
    location: { type: String },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

EncounterSchema.index({ patientId: 1 });
EncounterSchema.index({ primaryDoctorId: 1 });
EncounterSchema.index({ visitDate: -1 });

export const Encounter: Model<IEncounter> = mongoose.model<IEncounter>('Encounter', EncounterSchema);
