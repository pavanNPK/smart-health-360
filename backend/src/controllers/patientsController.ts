import { Request, Response } from 'express';
import { z } from 'zod';
import { Patient } from '../models/Patient';
import { AuthUser } from '../middleware/auth';
import { canViewPatient } from '../services/permissions';
import { sendPatientRegistrationEmail } from '../services/mail';

const createPatientSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dob: z.string(),
  gender: z.enum(['M', 'F', 'O']).optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  nationalId: z.string().optional(),
  isPrivatePatient: z.boolean().optional().default(false),
});

const assignDoctorSchema = z.object({
  doctorId: z.string().min(1),
});

export async function createPatient(req: Request, res: Response): Promise<void> {
  const parsed = createPatientSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid input', errors: parsed.error.flatten() });
    return;
  }
  const user = req.user!;
  const data = { ...parsed.data, contactEmail: parsed.data.contactEmail || undefined };
  const patient = await Patient.create({
    ...data,
    dob: new Date(data.dob),
    createdBy: user.id,
  });
  if (patient.contactEmail) {
    sendPatientRegistrationEmail(patient.contactEmail, `${patient.firstName} ${patient.lastName}`).catch(() => {});
  }
  res.status(201).json(patient);
}

export async function listPatients(req: Request, res: Response): Promise<void> {
  const user = req.user! as AuthUser;
  const assignedTo = req.query.assignedTo as string | undefined;
  const search = (req.query.search as string)?.trim();
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
  const skip = (page - 1) * limit;
  const filter: Record<string, unknown> = {};
  if (user.role === 'DOCTOR' && assignedTo === 'me') {
    filter.primaryDoctorId = user.id;
  }
  if (search) {
    filter.$or = [
      { firstName: new RegExp(search, 'i') },
      { lastName: new RegExp(search, 'i') },
      { contactEmail: new RegExp(search, 'i') },
    ];
  }
  const [patients, total] = await Promise.all([
    Patient.find(filter).populate('primaryDoctorId', 'name email').skip(skip).limit(limit).lean(),
    Patient.countDocuments(filter),
  ]);
  res.json({ data: patients, total, page, limit });
}

export async function getPatient(req: Request, res: Response): Promise<void> {
  const patient = await Patient.findById(req.params.id).populate('primaryDoctorId', 'name email');
  if (!patient) {
    res.status(404).json({ message: 'Patient not found' });
    return;
  }
  const user = req.user! as AuthUser;
  if (!canViewPatient(patient, user)) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }
  res.json(patient);
}

export async function assignDoctor(req: Request, res: Response): Promise<void> {
  const parsed = assignDoctorSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid input' });
    return;
  }
  const patient = await Patient.findByIdAndUpdate(
    req.params.id,
    { $set: { primaryDoctorId: parsed.data.doctorId } },
    { new: true }
  ).populate('primaryDoctorId', 'name email');
  if (!patient) {
    res.status(404).json({ message: 'Patient not found' });
    return;
  }
  res.json(patient);
}
