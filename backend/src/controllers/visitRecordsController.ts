import { Request, Response } from 'express';
import { z } from 'zod';
import { Patient } from '../models/Patient';
import { VisitRecord } from '../models/VisitRecord';
import { AuthUser } from '../middleware/auth';
import { canViewPatientAsync } from '../services/permissions';
import type { VisitType } from '../models/VisitRecord';

const createVisitRecordSchema = z.object({
  visitType: z.enum(['NEW', 'FOLLOWUP', 'CONTINUATION']),
  visitedAt: z.string().min(1),
  diseaseSummary: z.string().optional(),
  diagnosis: z.string().optional(),
  treatedByDoctorId: z.string().optional(),
  prescribedMedicinesSummary: z.string().optional(),
  notes: z.string().optional(),
});

export async function listVisitRecords(req: Request, res: Response): Promise<void> {
  const patient = await Patient.findById(req.params.id);
  if (!patient) {
    res.status(404).json({ message: 'Patient not found' });
    return;
  }
  const user = req.user! as AuthUser;
  const allowed = await canViewPatientAsync(patient, user);
  if (!allowed) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }
  const visitType = req.query.visitType as VisitType | undefined;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;
  const filter: Record<string, unknown> = { patientId: patient._id };
  if (visitType && ['NEW', 'FOLLOWUP', 'CONTINUATION'].includes(visitType)) {
    filter.visitType = visitType;
  }
  const [data, total] = await Promise.all([
    VisitRecord.find(filter)
      .populate('treatedByDoctorId', 'name')
      .populate('createdByUserId', 'name')
      .sort({ visitedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    VisitRecord.countDocuments(filter),
  ]);
  res.json({ data, total, page, limit });
}

export async function createVisitRecord(req: Request, res: Response): Promise<void> {
  const user = req.user! as AuthUser;
  if (user.role !== 'RECEPTIONIST') {
    res.status(403).json({ message: 'Only receptionist can create visit records' });
    return;
  }
  const patient = await Patient.findById(req.params.id);
  if (!patient) {
    res.status(404).json({ message: 'Patient not found' });
    return;
  }
  const allowed = await canViewPatientAsync(patient, user);
  if (!allowed) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }
  const parsed = createVisitRecordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid input', errors: parsed.error.flatten() });
    return;
  }
  const visitedAt = new Date(parsed.data.visitedAt);
  if (isNaN(visitedAt.getTime())) {
    res.status(400).json({ message: 'Invalid visitedAt date' });
    return;
  }
  const record = await VisitRecord.create({
    patientId: patient._id,
    visitType: parsed.data.visitType,
    visitedAt,
    diseaseSummary: parsed.data.diseaseSummary,
    diagnosis: parsed.data.diagnosis,
    treatedByDoctorId: parsed.data.treatedByDoctorId || undefined,
    prescribedMedicinesSummary: parsed.data.prescribedMedicinesSummary,
    notes: parsed.data.notes,
    createdByRole: user.role,
    createdByUserId: user.id,
  });
  const populated = await VisitRecord.findById(record._id)
    .populate('treatedByDoctorId', 'name')
    .populate('createdByUserId', 'name')
    .lean();
  res.status(201).json(populated);
}
