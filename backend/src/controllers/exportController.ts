import { Request, Response } from 'express';
import { z } from 'zod';
import { Patient } from '../models/Patient';
import { Record } from '../models/Record';
import { Report } from '../models/Report';
import { AuthUser } from '../middleware/auth';
import { canViewPatient, canExportVisB, canViewRecord } from '../services/permissions';
import { getInspectionMode } from '../services/inspectionMode';
import { logAudit } from '../services/audit';
import { sendExportAuditEmail } from '../services/mail';
import { User } from '../models/User';

const exportSchema = z.object({
  format: z.enum(['PDF', 'ZIP']).default('PDF'),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  types: z.array(z.string()).optional(),
  includeReports: z.boolean().optional().default(true),
});

export async function exportRecords(req: Request, res: Response): Promise<void> {
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
  const parsed = exportSchema.safeParse(req.body);
  const fromDate = parsed.success && parsed.data.fromDate ? new Date(parsed.data.fromDate) : undefined;
  const toDate = parsed.success && parsed.data.toDate ? new Date(parsed.data.toDate) : undefined;
  const types = parsed.success ? parsed.data.types : undefined;
  const inspectionModeOn = await getInspectionMode();
  const includeVisB = !inspectionModeOn && canExportVisB(patient, user);
  const recordFilter: Record<string, unknown> = { patientId: patient._id };
  if (!includeVisB) recordFilter.visibility = 'VIS_A';
  const dateCond: Record<string, Date> = {};
  if (fromDate) dateCond.$gte = fromDate;
  if (toDate) dateCond.$lte = toDate;
  if (Object.keys(dateCond).length) recordFilter.createdAt = dateCond;
  if (types?.length) recordFilter.type = { $in: types };
  let records = await Record.find(recordFilter).populate('createdBy', 'name').sort({ createdAt: -1 }).lean();
  records = records.filter((r) => canViewRecord(r as any, patient, user));
  const reportFilter: Record<string, unknown> = { patientId: patient._id };
  if (!includeVisB) reportFilter.visibility = 'VIS_A';
  if (inspectionModeOn) reportFilter._vaulted = { $ne: true };
  let reports = await Report.find(reportFilter).lean();
  reports = reports.filter((r) => {
    if (r.visibility === 'VIS_A') return true;
    if (user.role === 'RECEPTIONIST') return false;
    if (user.role === 'DOCTOR') return patient.primaryDoctorId?.toString() === user.id;
    return true;
  });
  const recordCount = records.length;
  await logAudit('EXPORT_RECORDS', user.id, {
    patientId: patient._id.toString(),
    details: { recordCount, format: parsed.success ? parsed.data.format : 'PDF', includeVisB, inspectionModeOn },
  });
  const saUsers = await User.find({ role: 'SUPER_ADMIN' }).select('email').limit(1).lean();
  if (saUsers[0]?.email) {
    sendExportAuditEmail(
      saUsers[0].email,
      user.id,
      `${(patient as any).firstName} ${(patient as any).lastName}`,
      recordCount
    ).catch(() => {});
  }
  res.json({
    exportId: `exp-${Date.now()}`,
    message: 'Export prepared. In a full implementation, a file would be generated and a download URL returned.',
    recordCount,
    reportCount: reports.length,
    downloadUrl: null,
  });
}
