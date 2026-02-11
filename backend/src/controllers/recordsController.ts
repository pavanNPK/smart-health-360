import { Request, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Patient } from '../models/Patient';
import { Record } from '../models/Record';
import { AuthUser } from '../middleware/auth';
import { canViewPatient, canViewRecord, canChangeVisibility } from '../services/permissions';
import { logAudit } from '../services/audit';
import type { RecordVisibility, RecordType } from '../models/Record';

const createRecordSchema = z.object({
  type: z.enum(['diagnosis', 'medication', 'report', 'note', 'lab', 'attachment']),
  visibility: z.enum(['VIS_A', 'VIS_B']).default('VIS_A'),
  title: z.string().optional(),
  description: z.string().optional(),
  disease: z.string().optional(),
  diagnosisRound: z.number().optional(),
  place: z.string().optional(),
  medications: z.array(z.object({
    name: z.string(),
    dosage: z.string(),
    frequency: z.string(),
    duration: z.string().optional(),
  })).optional(),
  notes: z.string().optional(),
  encounterId: z.string().optional(),
});

const visibilitySchema = z.object({
  visibility: z.enum(['VIS_A', 'VIS_B']),
  reason: z.string().min(1),
});

export async function createRecord(req: Request, res: Response): Promise<void> {
  const patient = await Patient.findById(req.params.id);
  if (!patient) {
    res.status(404).json({ message: 'Patient not found' });
    return;
  }
  const user = req.user! as AuthUser;
  if (!canViewPatient(patient, user)) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }
  const parsed = createRecordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid input', errors: parsed.error.flatten() });
    return;
  }
  const doctorId = user.role === 'DOCTOR' ? user.id : patient.primaryDoctorId;
  const record = await Record.create({
    ...parsed.data,
    patientId: patient._id,
    createdBy: user.id,
    assignedDoctorId: doctorId,
  });
  res.status(201).json(record);
}

export async function listRecords(req: Request, res: Response): Promise<void> {
  const status = req.query.status as string | undefined; // VIS_A | VIS_B | all (omit = all)
  if (status && status !== 'all' && !['VIS_A', 'VIS_B'].includes(status)) {
    res.status(400).json({ message: 'status must be VIS_A, VIS_B, or all' });
    return;
  }
  const patient = await Patient.findById(req.params.id);
  if (!patient) {
    res.status(404).json({ message: 'Patient not found' });
    return;
  }
  const user = req.user! as AuthUser;
  if (!canViewPatient(patient, user)) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;
  const type = req.query.type as RecordType | undefined;
  const fromDate = req.query.fromDate ? new Date(req.query.fromDate as string) : undefined;
  const toDate = req.query.toDate ? new Date(req.query.toDate as string) : undefined;
  const createdBy = req.query.createdBy as string | undefined;
  const filter: Record<string, unknown> = { patientId: patient._id };
  if (status && status !== 'all') filter.visibility = status;
  if (type) filter.type = type;
  if (fromDate || toDate) {
    filter.createdAt = {};
    if (fromDate) (filter.createdAt as Record<string, Date>).$gte = fromDate;
    if (toDate) (filter.createdAt as Record<string, Date>).$lte = toDate;
  }
  if (createdBy) filter.createdBy = createdBy;
  let records = await Record.find(filter).populate('createdBy', 'name').sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
  records = records.filter((r) => canViewRecord(r as any, patient, user));
  const total = await Record.countDocuments(filter);
  res.json({ data: records, total, page, limit });
}

export async function updateVisibility(req: Request, res: Response): Promise<void> {
  const record = await Record.findById(req.params.recordId).populate('patientId');
  if (!record || !record.patientId) {
    res.status(404).json({ message: 'Record not found' });
    return;
  }
  const patient = record.patientId as any;
  const user = req.user! as AuthUser;
  if (!canChangeVisibility(patient, user)) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }
  const parsed = visibilitySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'reason and visibility required' });
    return;
  }
  const previousVisibility = record.visibility;
  record.visibility = parsed.data.visibility as RecordVisibility;
  await record.save();
  await logAudit('MOVE_VISIBILITY', user.id, {
    recordId: record._id.toString(),
    patientId: record.patientId.toString(),
    details: {
      previousVisibility,
      newVisibility: parsed.data.visibility,
      reason: parsed.data.reason,
    },
  });
  res.json(record);
}
