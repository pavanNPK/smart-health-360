import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IArea extends Document {
  name: string;
  code?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AreaSchema = new Schema<IArea>(
  {
    name: { type: String, required: true },
    code: { type: String },
  },
  { timestamps: true }
);

AreaSchema.index({ name: 1 });

export const Area: Model<IArea> = mongoose.model<IArea>('Area', AreaSchema);
