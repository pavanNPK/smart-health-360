import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMedicineItem {
  name: string;
  dosageText: string;
  frequencyPerDay?: number;
  days?: number;
  instructions?: string;
  beforeFood: boolean;
}

export interface ITestOrXrayItem {
  type: 'XRAY' | 'LAB' | 'SCAN';
  name: string;
  notes?: string;
}

export interface IDoctorApproval {
  approved: boolean;
  approvedAt?: Date;
  approvedByDoctorId?: mongoose.Types.ObjectId;
  remarks?: string;
}

export type PrescriptionStatus = 'DRAFT' | 'FINAL';

export interface IPrescription extends Document {
  patientId: mongoose.Types.ObjectId;
  writtenByDoctorId?: mongoose.Types.ObjectId;
  enteredByReceptionistId?: mongoose.Types.ObjectId;
  enteredAt: Date;
  prescriptionDate: Date;
  complaintSymptoms?: string;
  diagnosis?: string;
  medicines: IMedicineItem[];
  testsOrXray: ITestOrXrayItem[];
  followUpDate?: Date;
  status: PrescriptionStatus;
  doctorApproval: IDoctorApproval;
  createdAt: Date;
  updatedAt: Date;
  createdByRole: 'RECEPTIONIST' | 'DOCTOR' | 'SUPER_ADMIN';
  updatedByRole?: 'RECEPTIONIST' | 'DOCTOR' | 'SUPER_ADMIN';
}

const MedicineItemSchema = new Schema<IMedicineItem>(
  {
    name: { type: String, required: true },
    dosageText: { type: String, required: true },
    frequencyPerDay: { type: Number },
    days: { type: Number },
    instructions: { type: String },
    beforeFood: { type: Boolean, default: false },
  },
  { _id: false }
);

const TestOrXrayItemSchema = new Schema<ITestOrXrayItem>(
  {
    type: { type: String, enum: ['XRAY', 'LAB', 'SCAN'], required: true },
    name: { type: String, required: true },
    notes: { type: String },
  },
  { _id: false }
);

const DoctorApprovalSchema = new Schema<IDoctorApproval>(
  {
    approved: { type: Boolean, default: false },
    approvedAt: { type: Date },
    approvedByDoctorId: { type: Schema.Types.ObjectId, ref: 'User' },
    remarks: { type: String },
  },
  { _id: false }
);

const PrescriptionSchema = new Schema<IPrescription>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    writtenByDoctorId: { type: Schema.Types.ObjectId, ref: 'User' },
    enteredByReceptionistId: { type: Schema.Types.ObjectId, ref: 'User' },
    enteredAt: { type: Date, required: true },
    prescriptionDate: { type: Date, required: true },
    complaintSymptoms: { type: String },
    diagnosis: { type: String },
    medicines: { type: [MedicineItemSchema], default: [] },
    testsOrXray: { type: [TestOrXrayItemSchema], default: [] },
    followUpDate: { type: Date },
    status: { type: String, enum: ['DRAFT', 'FINAL'], default: 'DRAFT' },
    doctorApproval: { type: DoctorApprovalSchema, default: () => ({ approved: false }) },
    createdByRole: { type: String, enum: ['RECEPTIONIST', 'DOCTOR', 'SUPER_ADMIN'], required: true },
    updatedByRole: { type: String, enum: ['RECEPTIONIST', 'DOCTOR', 'SUPER_ADMIN'] },
  },
  { timestamps: true }
);

PrescriptionSchema.index({ patientId: 1, prescriptionDate: -1 });
PrescriptionSchema.index({ status: 1 });

export const Prescription: Model<IPrescription> = mongoose.model<IPrescription>('Prescription', PrescriptionSchema);
