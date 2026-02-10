import { Request, Response } from 'express';
import { z } from 'zod';
import { Clinic } from '../models/Clinic';
import { User } from '../models/User';
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
