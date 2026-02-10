import { Request, Response } from 'express';
import { z } from 'zod';
import { ReceptionistAttendance } from '../models/ReceptionistAttendance';
import { User } from '../models/User';
import { AuthUser } from '../middleware/auth';

const setAttendanceSchema = z.object({
  userId: z.string().min(1).optional(), // SA can set for any; receptionist sets for self
  date: z.string().min(1), // YYYY-MM-DD
  status: z.enum(['PRESENT', 'ABSENT']),
  notes: z.string().optional(),
});

function toStartOfDayUTC(dateStr: string): Date {
  const d = new Date(dateStr + 'T00:00:00.000Z');
  if (isNaN(d.getTime())) throw new Error('Invalid date');
  return d;
}

export async function getAttendance(req: Request, res: Response): Promise<void> {
  const user = req.user! as AuthUser;
  const clinicId = req.query.clinicId as string | undefined;
  const dateStr = req.query.date as string | undefined;
  if (!dateStr) {
    res.status(400).json({ message: 'date (YYYY-MM-DD) required' });
    return;
  }
  let userIds: string[] = [];
  if (user.role === 'SUPER_ADMIN' && clinicId) {
    const recs = await User.find({ role: 'RECEPTIONIST', clinicId }).distinct('_id');
    userIds = recs.map((id) => id.toString());
  } else if (user.role === 'DOCTOR' && user.clinicId) {
    const recs = await User.find({ role: 'RECEPTIONIST', clinicId: user.clinicId }).distinct('_id');
    userIds = recs.map((id) => id.toString());
  } else if (user.role === 'RECEPTIONIST') {
    userIds = [user.id];
  } else {
    res.json({ data: [] });
    return;
  }
  const date = toStartOfDayUTC(dateStr);
  const records = await ReceptionistAttendance.find({
    userId: { $in: userIds },
    date,
  })
    .populate('userId', 'name email')
    .lean();
  res.json({ data: records });
}

export async function setAttendance(req: Request, res: Response): Promise<void> {
  const user = req.user! as AuthUser;
  const parsed = setAttendanceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid input', errors: parsed.error.flatten() });
    return;
  }
  const targetUserId = parsed.data.userId ?? user.id;
  if (user.role === 'RECEPTIONIST' && targetUserId !== user.id) {
    res.status(403).json({ message: 'Receptionists can only set their own attendance' });
    return;
  }
  if (user.role === 'DOCTOR') {
    const target = await User.findById(targetUserId);
    if (!target || target.role !== 'RECEPTIONIST' || target.clinicId?.toString() !== user.clinicId) {
      res.status(403).json({ message: 'Can only set attendance for receptionists in your clinic' });
      return;
    }
  }
  const date = toStartOfDayUTC(parsed.data.date);
  const doc = await ReceptionistAttendance.findOneAndUpdate(
    { userId: targetUserId, date },
    { $set: { status: parsed.data.status, notes: parsed.data.notes } },
    { new: true, upsert: true }
  );
  const populated = await ReceptionistAttendance.findById(doc._id).populate('userId', 'name email').lean();
  res.json(populated);
}
