import { Request, Response } from 'express';
import { z } from 'zod';
import { Patient } from '../models/Patient';
import { Prescription } from '../models/Prescription';
import { AuthUser } from '../middleware/auth';
import { canViewPatientAsync } from '../services/permissions';
import { finalizePrescriptionAndNotify } from '../services/prescriptionService';

const medicineItemSchema = z.object({
  name: z.string().min(1),
  dosageText: z.string().min(1),
  frequencyPerDay: z.number().optional(),
  days: z.number().optional(),
  instructions: z.string().optional(),
  beforeFood: z.boolean().default(false),
});

const testOrXrayItemSchema = z.object({
  type: z.enum(['XRAY', 'LAB', 'SCAN']),
  name: z.string().min(1),
  notes: z.string().optional(),
});

const createPrescriptionSchema = z.object({
  writtenByDoctorId: z.string().optional(),
  prescriptionDate: z.string().min(1),
  complaintSymptoms: z.string().optional(),
  diagnosis: z.string().optional(),
  medicines: z.array(medicineItemSchema).default([]),
  testsOrXray: z.array(testOrXrayItemSchema).default([]),
  followUpDate: z.string().optional(),
  status: z.enum(['DRAFT', 'FINAL']).default('DRAFT'),
});

const updatePrescriptionSchema = z.object({
  prescriptionDate: z.string().optional(),
  complaintSymptoms: z.string().optional(),
  diagnosis: z.string().optional(),
  medicines: z.array(medicineItemSchema).optional(),
  testsOrXray: z.array(testOrXrayItemSchema).optional(),
  followUpDate: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'FINAL']).optional(),
  doctorApproval: z
    .object({
      approved: z.boolean(),
      remarks: z.string().optional(),
    })
    .optional(),
});

export async function listPrescriptions(req: Request, res: Response): Promise<void> {
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
  const status = req.query.status as string | undefined;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;
  const filter: Record<string, unknown> = { patientId: patient._id };
  if (status && ['DRAFT', 'FINAL'].includes(status)) filter.status = status;
  const [data, total] = await Promise.all([
    Prescription.find(filter)
      .populate('writtenByDoctorId', 'name')
      .populate('enteredByReceptionistId', 'name')
      .sort({ prescriptionDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Prescription.countDocuments(filter),
  ]);
  res.json({ data, total, page, limit });
}

export async function createPrescription(req: Request, res: Response): Promise<void> {
  const user = req.user! as AuthUser;
  if (user.role !== 'RECEPTIONIST') {
    res.status(403).json({ message: 'Only receptionist can create prescriptions' });
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
  const parsed = createPrescriptionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid input', errors: parsed.error.flatten() });
    return;
  }
  if (parsed.data.status === 'FINAL' && (!parsed.data.medicines || parsed.data.medicines.length === 0)) {
    res.status(400).json({ message: 'Medicines list cannot be empty when status is FINAL' });
    return;
  }
  const prescriptionDate = new Date(parsed.data.prescriptionDate);
  if (isNaN(prescriptionDate.getTime())) {
    res.status(400).json({ message: 'Invalid prescription date' });
    return;
  }
  const followUpDate = parsed.data.followUpDate ? new Date(parsed.data.followUpDate) : undefined;
  const doc = await Prescription.create({
    patientId: patient._id,
    writtenByDoctorId: parsed.data.writtenByDoctorId || patient.primaryDoctorId,
    enteredByReceptionistId: user.id,
    enteredAt: new Date(),
    prescriptionDate,
    complaintSymptoms: parsed.data.complaintSymptoms,
    diagnosis: parsed.data.diagnosis,
    medicines: parsed.data.medicines,
    testsOrXray: parsed.data.testsOrXray,
    followUpDate: followUpDate && !isNaN(followUpDate.getTime()) ? followUpDate : undefined,
    status: parsed.data.status,
    createdByRole: user.role,
  });
  if (doc.status === 'FINAL') {
    finalizePrescriptionAndNotify(doc._id.toString()).catch((err) =>
      console.error('Prescription notify failed:', err)
    );
  }
  const populated = await Prescription.findById(doc._id)
    .populate('writtenByDoctorId', 'name')
    .populate('enteredByReceptionistId', 'name')
    .lean();
  res.status(201).json(populated);
}

export async function updatePrescription(req: Request, res: Response): Promise<void> {
  const prescription = await Prescription.findById(req.params.id).populate('patientId');
  if (!prescription || !prescription.patientId) {
    res.status(404).json({ message: 'Prescription not found' });
    return;
  }
  const user = req.user! as AuthUser;
  const patient = prescription.patientId as any;
  const allowed = await canViewPatientAsync(patient, user);
  if (!allowed) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }
  const parsed = updatePrescriptionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid input', errors: parsed.error.flatten() });
    return;
  }
  const isReceptionist = user.role === 'RECEPTIONIST';
  const isDoctor = user.role === 'DOCTOR';
  const isSA = user.role === 'SUPER_ADMIN';
  if (isSA) {
    res.status(403).json({ message: 'Super Admin is read-only for prescriptions' });
    return;
  }
  if (parsed.data.status === 'FINAL') {
    const medicines = parsed.data.medicines ?? prescription.medicines;
    if (!medicines || medicines.length === 0) {
      res.status(400).json({ message: 'Medicines list cannot be empty when status is FINAL' });
      return;
    }
  }
  if (isReceptionist) {
    if (parsed.data.doctorApproval !== undefined) {
      res.status(403).json({ message: 'Only doctor can set approval' });
      return;
    }
    if (parsed.data.prescriptionDate !== undefined) prescription.prescriptionDate = new Date(parsed.data.prescriptionDate);
    if (parsed.data.complaintSymptoms !== undefined) prescription.complaintSymptoms = parsed.data.complaintSymptoms;
    if (parsed.data.diagnosis !== undefined) prescription.diagnosis = parsed.data.diagnosis;
    if (parsed.data.medicines !== undefined) prescription.medicines = parsed.data.medicines;
    if (parsed.data.testsOrXray !== undefined) prescription.testsOrXray = parsed.data.testsOrXray;
    if (parsed.data.followUpDate !== undefined)
      prescription.followUpDate = parsed.data.followUpDate ? new Date(parsed.data.followUpDate) : undefined;
    if (parsed.data.status !== undefined) prescription.status = parsed.data.status;
    prescription.updatedByRole = 'RECEPTIONIST';
  }
  if (isDoctor) {
    if (parsed.data.doctorApproval !== undefined) {
      prescription.doctorApproval = {
        ...prescription.doctorApproval,
        approved: parsed.data.doctorApproval.approved,
        remarks: parsed.data.doctorApproval.remarks,
        approvedAt: new Date(),
        approvedByDoctorId: user.id as any,
      };
    }
    prescription.updatedByRole = 'DOCTOR';
  }
  const previousStatus = prescription.status;
  await prescription.save();
  if (previousStatus !== 'FINAL' && prescription.status === 'FINAL') {
    finalizePrescriptionAndNotify(prescription._id.toString()).catch((err) =>
      console.error('Prescription notify failed:', err)
    );
  }
  const updated = await Prescription.findById(prescription._id)
    .populate('writtenByDoctorId', 'name')
    .populate('enteredByReceptionistId', 'name')
    .lean();
  res.json(updated);
}
