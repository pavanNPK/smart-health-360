import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IClinic extends Document {
  name: string;
  areaId: mongoose.Types.ObjectId;
  code?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ClinicSchema = new Schema<IClinic>(
  {
    name: { type: String, required: true },
    areaId: { type: Schema.Types.ObjectId, ref: 'Area', required: true },
    code: { type: String },
  },
  { timestamps: true }
);

ClinicSchema.index({ areaId: 1 });
ClinicSchema.index({ name: 1 });

export const Clinic: Model<IClinic> = mongoose.model<IClinic>('Clinic', ClinicSchema);
