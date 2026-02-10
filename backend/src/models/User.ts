import mongoose, { Schema, Document, Model } from 'mongoose';

export type UserRole = 'RECEPTIONIST' | 'DOCTOR' | 'SUPER_ADMIN';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING_VERIFICATION';
  specialization?: string;
  clinicId?: mongoose.Types.ObjectId; // for DOCTOR and RECEPTIONIST
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true }, // placeholder until verify; replaced on verify-otp
    role: { type: String, enum: ['RECEPTIONIST', 'DOCTOR', 'SUPER_ADMIN'], required: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'PENDING_VERIFICATION'], default: 'ACTIVE' },
    specialization: { type: String },
    clinicId: { type: Schema.Types.ObjectId, ref: 'Clinic' },
  },
  { timestamps: true }
);

// email index is created automatically by unique: true on the field
UserSchema.index({ role: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ clinicId: 1 });

export const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);
