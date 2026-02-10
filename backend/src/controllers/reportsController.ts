import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import multer from 'multer';
import { Patient } from '../models/Patient';
import { Report } from '../models/Report';
import { AuthUser } from '../middleware/auth';
import { canViewPatient, canViewRecord } from '../services/permissions';

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`),
});
export const uploadMiddleware = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

const reportMetaSchema = z.object({
  visibility: z.enum(['PUBLIC', 'PRIVATE']).default('PUBLIC'),
  reportType: z.string().optional(),
  labName: z.string().optional(),
  reportDate: z.string().optional(),
  description: z.string().optional(),
});

export async function uploadReport(req: Request, res: Response): Promise<void> {
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
  const file = req.file;
  if (!file) {
    res.status(400).json({ message: 'No file uploaded' });
    return;
  }
  const meta = reportMetaSchema.safeParse(req.body);
  const visibility = meta.success ? meta.data.visibility : 'PUBLIC';
  const reportDoc = await Report.create({
    patientId: patient._id,
    uploadedBy: user.id,
    visibility,
    fileName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    storageProvider: 'LOCAL',
    storageKey: file.filename,
    reportType: meta.success ? meta.data.reportType : undefined,
    labName: meta.success ? meta.data.labName : undefined,
    reportDate: meta.success && meta.data.reportDate ? new Date(meta.data.reportDate) : undefined,
    description: meta.success ? meta.data.description : undefined,
  });
  res.status(201).json(reportDoc);
}

export async function listReports(req: Request, res: Response): Promise<void> {
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
  const visibility = req.query.visibility as string | undefined;
  const filter: Record<string, unknown> = { patientId: patient._id };
  if (visibility === 'PUBLIC' || visibility === 'PRIVATE') filter.visibility = visibility;
  let reports = await Report.find(filter).sort({ reportDate: -1, createdAt: -1 }).lean();
  if (visibility !== 'PUBLIC') {
    reports = reports.filter((r) => {
      if (r.visibility === 'PUBLIC') return true;
      if (user.role === 'RECEPTIONIST') return false;
      if (user.role === 'DOCTOR') return patient.primaryDoctorId?.toString() === user.id;
      return true;
    });
  }
  res.json({ data: reports });
}
