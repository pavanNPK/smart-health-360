import { Request, Response } from 'express';
import { z } from 'zod';
import { Patient } from '../models/Patient';
import { Record } from '../models/Record';
import { ImportSession } from '../models/ImportSession';
import { AuthUser } from '../middleware/auth';
import { canViewPatient } from '../services/permissions';
import { logAudit } from '../services/audit';

const itemSchema = z.object({
  type: z.enum(['diagnosis', 'medication', 'report', 'note', 'lab', 'attachment']),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).default('PUBLIC'),
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
});

const importSchema = z.object({
  fileName: z.string().optional().default('import'),
  items: z.array(itemSchema),
});

export async function importRecords(req: Request, res: Response): Promise<void> {
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
  const parsed = importSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid input', errors: parsed.error.flatten() });
    return;
  }
  const session = await ImportSession.create({
    patientId: patient._id,
    initiatedBy: user.id,
    fileName: parsed.data.fileName,
    totalItems: parsed.data.items.length,
    successCount: 0,
    failureCount: 0,
    status: 'PENDING',
    importErrors: [],
  });
  const importErrors: { row: number; message: string }[] = [];
  let successCount = 0;
  const doctorId = user.role === 'DOCTOR' ? user.id : patient.primaryDoctorId;
  for (let i = 0; i < parsed.data.items.length; i++) {
    const item = parsed.data.items[i];
    try {
      await Record.create({
        ...item,
        patientId: patient._id,
        createdBy: user.id,
        assignedDoctorId: doctorId,
        importSessionId: session._id,
      });
      successCount++;
    } catch (e: unknown) {
      importErrors.push({ row: i + 1, message: e instanceof Error ? e.message : 'Unknown error' });
    }
  }
  session.successCount = successCount;
  session.failureCount = importErrors.length;
  session.status = importErrors.length === parsed.data.items.length ? 'FAILED' : 'COMPLETED';
  session.importErrors = importErrors;
  session.completedAt = new Date();
  await session.save();
  await logAudit('IMPORT_RECORDS', user.id, {
    patientId: patient._id.toString(),
    importSessionId: session._id.toString(),
    details: { totalItems: parsed.data.items.length, successCount, failureCount: importErrors.length },
  });
  res.status(201).json({
    importSessionId: session._id,
    totalItems: parsed.data.items.length,
    successCount,
    failureCount: importErrors.length,
    errors: importErrors.slice(0, 20),
  });
}
