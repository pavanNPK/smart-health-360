import { Request, Response } from 'express';
import { z } from 'zod';
import { Record } from '../models/Record';
import { Report } from '../models/Report';
import { RecordVault } from '../models/RecordVault';
import { AuthUser } from '../middleware/auth';
import { logAudit } from '../services/audit';
import { getInspectionMode, setInspectionMode } from '../services/inspectionMode';

const emergencyHideSchema = z.object({
  reason: z.string().min(1),
});

export async function triggerEmergencyHide(req: Request, res: Response): Promise<void> {
  const user = req.user! as AuthUser;
  if (user.role !== 'SUPER_ADMIN') {
    res.status(403).json({ message: 'Only Super Admin can trigger Emergency Hide' });
    return;
  }
  const parsed = emergencyHideSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'reason required' });
    return;
  }
  const alreadyOn = await getInspectionMode();
  if (alreadyOn) {
    res.json({ message: 'Inspection mode already ON', inspectionMode: true });
    return;
  }
  const visBRecords = await Record.find({ visibility: 'VIS_B' }).lean();
  const visBReports = await Report.find({ visibility: 'VIS_B' }).lean();
  const movedRecordIds: string[] = [];
  for (const r of visBRecords) {
    await RecordVault.create({
      _originalId: r._id,
      patientId: r.patientId,
      visibility: r.visibility,
      type: r.type,
      createdBy: r.createdBy,
      assignedDoctorId: r.assignedDoctorId,
      title: r.title,
      description: r.description,
      disease: r.disease,
      notes: r.notes,
      _movedBy: user.id,
    });
    await Record.deleteOne({ _id: r._id });
    movedRecordIds.push((r as { _id: unknown })._id as string);
  }
  if (visBReports.length > 0) {
    await Report.updateMany(
      { visibility: 'VIS_B' },
      { $set: { _vaulted: true, _vaultedAt: new Date(), _vaultedBy: user.id } }
    );
  }
  await setInspectionMode(true, user.id);
  await logAudit('EMERGENCY_HIDE', user.id, {
    details: {
      reason: parsed.data.reason,
      recordCount: movedRecordIds.length,
      reportCount: visBReports.length,
      movedRecordIds: movedRecordIds.slice(0, 100),
    },
  });
  res.json({
    message: 'Emergency Hide activated. VIS_B records moved to vault.',
    inspectionMode: true,
    recordCount: movedRecordIds.length,
    reportCount: visBReports.length,
  });
}

export async function triggerEmergencyRestore(req: Request, res: Response): Promise<void> {
  const user = req.user! as AuthUser;
  if (user.role !== 'SUPER_ADMIN') {
    res.status(403).json({ message: 'Only Super Admin can restore VIS_B' });
    return;
  }
  const alreadyOn = await getInspectionMode();
  if (!alreadyOn) {
    res.json({ message: 'Inspection mode already OFF', inspectionMode: false });
    return;
  }
  const vaultRecords = await RecordVault.find({}).lean();
  let restored = 0;
  for (const v of vaultRecords) {
    await Record.create({
      patientId: v.patientId,
      visibility: v.visibility,
      type: v.type,
      createdBy: v.createdBy,
      assignedDoctorId: v.assignedDoctorId,
      title: v.title,
      description: v.description,
      disease: v.disease,
      notes: v.notes,
    });
    await RecordVault.deleteOne({ _id: v._id });
    restored++;
  }
  await Report.updateMany({ _vaulted: true }, { $unset: { _vaulted: 1, _vaultedAt: 1, _vaultedBy: 1 } });
  await setInspectionMode(false, user.id);
  await logAudit('EMERGENCY_RESTORE', user.id, {
    details: { recordCount: restored },
  });
  res.json({
    message: 'VIS_B records restored. Inspection mode OFF.',
    inspectionMode: false,
    recordCount: restored,
  });
}

export async function getInspectionModeStatus(req: Request, res: Response): Promise<void> {
  const user = req.user! as AuthUser;
  if (user.role !== 'SUPER_ADMIN') {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }
  const inspectionMode = await getInspectionMode();
  res.json({ inspectionMode });
}
