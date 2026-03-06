import { Request, Response } from 'express';
import { z } from 'zod';
import { Patient } from '../models/Patient';
import { PatientAttachment } from '../models/PatientAttachment';
import { AuthUser } from '../middleware/auth';
import { canViewPatientAsync } from '../services/permissions';
import type { AttachmentCategory } from '../models/PatientAttachment';

const createAttachmentSchema = z.object({
  category: z.enum(['MEDICINE', 'XRAY', 'LAB_REPORT', 'SCAN', 'OTHER']),
  name: z.string().min(1),
  description: z.string().optional(),
  fileUrl: z.string().optional(),
  prescriptionId: z.string().optional(),
  visitRecordId: z.string().optional(),
});

export async function listAttachments(req: Request, res: Response): Promise<void> {
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
  const category = req.query.category as AttachmentCategory | undefined;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;
  const filter: Record<string, unknown> = { patientId: patient._id };
  if (category && ['MEDICINE', 'XRAY', 'LAB_REPORT', 'SCAN', 'OTHER'].includes(category)) {
    filter.category = category;
  }
  const [data, total] = await Promise.all([
    PatientAttachment.find(filter)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    PatientAttachment.countDocuments(filter),
  ]);
  res.json({ data, total, page, limit });
}

export async function createAttachment(req: Request, res: Response): Promise<void> {
  const user = req.user! as AuthUser;
  if (user.role !== 'RECEPTIONIST') {
    res.status(403).json({ message: 'Only receptionist can add attachments' });
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
  const parsed = createAttachmentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid input', errors: parsed.error.flatten() });
    return;
  }
  const doc = await PatientAttachment.create({
    patientId: patient._id,
    category: parsed.data.category,
    name: parsed.data.name,
    description: parsed.data.description,
    fileUrl: parsed.data.fileUrl,
    prescriptionId: parsed.data.prescriptionId,
    visitRecordId: parsed.data.visitRecordId,
    createdBy: user.id,
    createdByRole: user.role,
  });
  const populated = await PatientAttachment.findById(doc._id).populate('createdBy', 'name').lean();
  res.status(201).json(populated);
}
