import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISystemSetting extends Document {
  key: string;
  value: unknown;
  updatedBy?: mongoose.Types.ObjectId;
  updatedAt: Date;
}

const SystemSettingSchema = new Schema<ISystemSetting>(
  {
    key: { type: String, required: true },
    value: { type: Schema.Types.Mixed, required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

SystemSettingSchema.index({ key: 1 }, { unique: true });

export const SystemSetting: Model<ISystemSetting> = mongoose.model<ISystemSetting>('SystemSetting', SystemSettingSchema);

export const INSPECTION_MODE_KEY = 'inspectionMode';
