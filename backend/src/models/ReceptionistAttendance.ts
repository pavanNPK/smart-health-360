import mongoose, { Schema, Document, Model } from 'mongoose';

export type AttendanceStatus = 'PRESENT' | 'ABSENT';

export interface IReceptionistAttendance extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date; // day (date only, no time)
  status: AttendanceStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReceptionistAttendanceSchema = new Schema<IReceptionistAttendance>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true }, // stored as start of day UTC
    status: { type: String, enum: ['PRESENT', 'ABSENT'], required: true },
    notes: { type: String },
  },
  { timestamps: true }
);

ReceptionistAttendanceSchema.index({ userId: 1, date: 1 }, { unique: true });
ReceptionistAttendanceSchema.index({ date: 1 });

export const ReceptionistAttendance: Model<IReceptionistAttendance> = mongoose.model<IReceptionistAttendance>(
  'ReceptionistAttendance',
  ReceptionistAttendanceSchema
);
