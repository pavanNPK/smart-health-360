import mongoose, { Schema, Document, Model } from 'mongoose';

export type VerificationType = 'email_verification';

export interface IVerificationCode extends Document {
  email: string;
  code: string;
  type: VerificationType;
  expiresAt: Date;
  createdAt: Date;
}

const VerificationCodeSchema = new Schema<IVerificationCode>(
  {
    email: { type: String, required: true },
    code: { type: String, required: true },
    type: { type: String, enum: ['email_verification'], required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

VerificationCodeSchema.index({ email: 1, type: 1 });
VerificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL - MongoDB removes expired docs

export const VerificationCode: Model<IVerificationCode> = mongoose.model<IVerificationCode>(
  'VerificationCode',
  VerificationCodeSchema
);
