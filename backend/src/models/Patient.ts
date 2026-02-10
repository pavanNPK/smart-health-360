import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPatient extends Document {
  firstName: string;
  lastName: string;
  dob: Date;
  gender?: 'M' | 'F' | 'O';
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  nationalId?: string;
  isPrivatePatient: boolean;
  primaryDoctorId?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PatientSchema = new Schema<IPatient>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    dob: { type: Date, required: true },
    gender: { type: String, enum: ['M', 'F', 'O'] },
    contactEmail: { type: String },
    contactPhone: { type: String },
    address: { type: String },
    nationalId: { type: String },
    isPrivatePatient: { type: Boolean, default: false },
    primaryDoctorId: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

PatientSchema.index({ lastName: 1, firstName: 1 });
PatientSchema.index({ primaryDoctorId: 1 });
PatientSchema.index({ createdBy: 1 });

export const Patient: Model<IPatient> = mongoose.model<IPatient>('Patient', PatientSchema);
