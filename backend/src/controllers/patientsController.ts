import { Request, Response } from 'express';
import { z } from 'zod';
import { Patient } from '../models/Patient';
import { Record } from '../models/Record';
import { User } from '../models/User';
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
  patientVisibility: z.enum(['VIS_A', 'VIS_B']).optional().default('VIS_A'),
  primaryDoctorId: z.string().min(1), // required: receptionist must assign doctor at creation
});

const updatePatientSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  dob: z.string().optional(),
  gender: z.enum(['M', 'F', 'O']).optional().nullable().or(z.literal('')),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  nationalId: z.string().optional(),
  patientVisibility: z.enum(['VIS_A', 'VIS_B']).optional(),
  primaryDoctorId: z.string().min(1).optional().or(z.literal('')),
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
    primaryDoctorId: parsed.data.primaryDoctorId,
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
  const createdBy = req.query.createdBy as string | undefined; // receptionist id: filter by who registered (doctor only, with assignedTo=me)
  const visibilityFilter = req.query.visibility as string | undefined; // 'VIS_A' | 'VIS_B' | omit = all
  const search = (req.query.search as string)?.trim();
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
  const skip = (page - 1) * limit;
  const filter: Record<string, unknown> = {};
  if (user.role === 'DOCTOR' && assignedTo === 'me') {
    filter.primaryDoctorId = user.id;
    if (createdBy) filter.createdBy = createdBy;
  }
  if (user.role === 'RECEPTIONIST' && user.clinicId) {
    const clinicDoctorIds = await User.find({ role: 'DOCTOR', clinicId: user.clinicId }).distinct('_id');
    filter.primaryDoctorId = { $in: clinicDoctorIds };
  }
  if (visibilityFilter === 'VIS_A') filter.patientVisibility = 'VIS_A';
  else if (visibilityFilter === 'VIS_B') filter.patientVisibility = 'VIS_B';
  if (search) {
    filter.$or = [
      { firstName: new RegExp(search, 'i') },
      { lastName: new RegExp(search, 'i') },
      { contactEmail: new RegExp(search, 'i') },
    ];
  }
  const [patientsRaw, total] = await Promise.all([
    Patient.find(filter).populate('primaryDoctorId', 'name email').populate('createdBy', 'name email').skip(skip).limit(limit).lean(),
    Patient.countDocuments(filter),
  ]);
  const patients = patientsRaw as Array<Record<string, unknown> & { _id: unknown }>;
  const patientIds = patients.map((p) => p._id);
  let countMap: Record<string, { visACount: number; visBCount: number }> = {};
  if (patientIds.length > 0) {
    const recordCounts = await Record.aggregate([
      { $match: { patientId: { $in: patientIds } } },
      { $group: { _id: { patientId: '$patientId', visibility: '$visibility' }, count: { $sum: 1 } } },
    ]).exec();
    patientIds.forEach((id) => {
      countMap[String(id)] = { visACount: 0, visBCount: 0 };
    });
    for (const r of recordCounts as Array<{ _id: { patientId: unknown; visibility: string }; count: number }>) {
      const pid = r._id?.patientId != null ? String(r._id.patientId) : '';
      if (!pid || !countMap[pid]) continue;
      if (r._id.visibility === 'VIS_A') countMap[pid].visACount = r.count;
      else if (r._id.visibility === 'VIS_B') countMap[pid].visBCount = r.count;
    }
  }
  const data = patients.map((p) => {
    const createdByObj = p.createdBy as { name?: string; email?: string } | null | undefined;
    const registeredBy =
      createdByObj && typeof createdByObj === 'object' && createdByObj.name != null
        ? { name: createdByObj.name, email: createdByObj.email }
        : undefined;
    return {
      ...p,
      createdBy: registeredBy,
      visACount: countMap[String(p._id)]?.visACount ?? 0,
      visBCount: countMap[String(p._id)]?.visBCount ?? 0,
    };
  });
  res.json({ data, total, page, limit });
}

export async function patientStats(req: Request, res: Response): Promise<void> {
  const user = req.user! as AuthUser;
  const assignedTo = req.query.assignedTo as string | undefined;
  const filter: Record<string, unknown> = {};
  if (user.role === 'DOCTOR' && assignedTo === 'me') {
    filter.primaryDoctorId = user.id;
  } else if (user.role !== 'SUPER_ADMIN') {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }
  const [total, visACount, visBCount] = await Promise.all([
    Patient.countDocuments(filter),
    Patient.countDocuments({ ...filter, patientVisibility: 'VIS_A' }),
    Patient.countDocuments({ ...filter, patientVisibility: 'VIS_B' }),
  ]);
  res.json({ total, visACount, visBCount });
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

export async function updatePatient(req: Request, res: Response): Promise<void> {
  const user = req.user! as AuthUser;
  if (user.role !== 'RECEPTIONIST' && user.role !== 'SUPER_ADMIN') {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }
  const parsed = updatePatientSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid input', errors: parsed.error.flatten() });
    return;
  }
  const id = req.params.id;
  if (!id || !/^[a-f0-9A-F]{24}$/.test(id)) {
    res.status(400).json({ message: 'Invalid patient id' });
    return;
  }
  const patient = await Patient.findById(id);
  if (!patient) {
    res.status(404).json({ message: 'Patient not found' });
    return;
  }
  if (!canViewPatient(patient, user)) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }
  const updates: Record<string, unknown> = { ...parsed.data };
  if (updates.contactEmail === '') updates.contactEmail = undefined;
  if (updates.gender === '') updates.gender = undefined;
  if (updates.primaryDoctorId === '') updates.primaryDoctorId = null;
  if (updates.dob) updates.dob = new Date(updates.dob as string);
  const updated = await Patient.findByIdAndUpdate(id, { $set: updates }, { new: true })
    .populate('primaryDoctorId', 'name email')
    .lean();
  res.json(updated);
}

export async function deletePatient(req: Request, res: Response): Promise<void> {
  const user = req.user! as AuthUser;
  if (user.role !== 'RECEPTIONIST' && user.role !== 'SUPER_ADMIN') {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }
  const patient = await Patient.findById(req.params.id);
  if (!patient) {
    res.status(404).json({ message: 'Patient not found' });
    return;
  }
  if (!canViewPatient(patient, user)) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }
  await Patient.findByIdAndDelete(req.params.id);
  res.status(204).send();
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
