import { Request, Response } from 'express';
import { z } from 'zod';
import { Clinic } from '../models/Clinic';
import { User } from '../models/User';
import { Patient } from '../models/Patient';
import { AuthUser } from '../middleware/auth';

const createClinicSchema = z.object({
  name: z.string().min(1),
  areaId: z.string().min(1),
  code: z.string().optional(),
});

export async function createClinic(req: Request, res: Response): Promise<void> {
  const parsed = createClinicSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid input', errors: parsed.error.flatten() });
    return;
  }
  const clinic = await Clinic.create(parsed.data);
  res.status(201).json(clinic);
}

export async function updateClinic(req: Request, res: Response): Promise<void> {
  const id = req.params.id;
  const parsed = createClinicSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid input', errors: parsed.error.flatten() });
    return;
  }
  const clinic = await Clinic.findByIdAndUpdate(id, parsed.data, { new: true }).populate('areaId', 'name code').lean();
  if (!clinic) {
    res.status(404).json({ message: 'Clinic not found' });
    return;
  }
  res.json(clinic);
}

export async function listClinics(req: Request, res: Response): Promise<void> {
  const user = req.user! as AuthUser;
  const areaId = req.query.areaId as string | undefined;
  const filter: Record<string, unknown> = {};
  if (user.role === 'SUPER_ADMIN') {
    if (areaId) filter.areaId = areaId;
  } else if (user.role === 'DOCTOR' || user.role === 'RECEPTIONIST') {
    if (user.clinicId) filter._id = user.clinicId;
    else {
      res.json({ data: [] });
      return;
    }
  }
  const clinics = await Clinic.find(filter).populate('areaId', 'name code').sort({ name: 1 }).lean();
  res.json({ data: clinics });
}

export async function getClinicDoctors(req: Request, res: Response): Promise<void> {
  const user = req.user! as AuthUser;
  const clinicId = req.params.id;
  if (user.role !== 'SUPER_ADMIN' && user.clinicId !== clinicId) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }
  const doctors = await User.find({ role: 'DOCTOR', clinicId }).select('-passwordHash').populate('clinicId', 'name').lean();
  res.json({ data: doctors });
}

export async function getClinicReceptionists(req: Request, res: Response): Promise<void> {
  const user = req.user! as AuthUser;
  const clinicId = req.params.id;
  if (user.role !== 'SUPER_ADMIN' && user.clinicId !== clinicId) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }
  const receptionists = await User.find({ role: 'RECEPTIONIST', clinicId }).select('-passwordHash').populate('clinicId', 'name').lean();
  res.json({ data: receptionists });
}

export async function getClinicReceptionistsWithStats(req: Request, res: Response): Promise<void> {
  const user = req.user! as AuthUser;
  const clinicId = req.params.id;
  if (user.role !== 'SUPER_ADMIN' && user.clinicId !== clinicId) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }
  const receptionists = await User.find({ role: 'RECEPTIONIST', clinicId }).select('-passwordHash').select('name email').lean();
  const recIds = receptionists.map((r) => r._id);
  const patientCounts = await Patient.aggregate([
    { $match: { createdBy: { $in: recIds } } },
    { $group: { _id: '$createdBy', patientCount: { $sum: 1 } } },
  ]).exec();
  const countMap: Record<string, number> = {};
  patientCounts.forEach((r: { _id: { toString: () => string }; patientCount: number }) => {
    countMap[r._id.toString()] = r.patientCount;
  });
  const data = receptionists.map((r) => ({
    _id: r._id,
    name: r.name,
    email: r.email,
    patientCount: countMap[(r._id as { toString: () => string }).toString()] ?? 0,
  }));
  res.json({ data });
}

export async function deleteClinic(req: Request, res: Response): Promise<void> {
  const id = req.params.id;
  const usersInClinic = await User.countDocuments({ clinicId: id });
  if (usersInClinic > 0) {
    res.status(400).json({ message: 'Cannot delete clinic: it has users. Remove or reassign users first.' });
    return;
  }
  const clinic = await Clinic.findByIdAndDelete(id);
  if (!clinic) {
    res.status(404).json({ message: 'Clinic not found' });
    return;
  }
  res.status(204).send();
}
