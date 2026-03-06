import { Request, Response } from 'express';
import { Patient } from '../models/Patient';
import { VisitRecord } from '../models/VisitRecord';
import { Prescription } from '../models/Prescription';
import { AuthUser } from '../middleware/auth';
import { canViewPatientAsync } from '../services/permissions';

export async function getPatientDetails(req: Request, res: Response): Promise<void> {
  const patient = await Patient.findById(req.params.id)
    .populate('primaryDoctorId', 'name email')
    .populate('createdBy', 'name')
    .lean();
  if (!patient) {
    res.status(404).json({ message: 'Patient not found' });
    return;
  }
  const user = req.user! as AuthUser;
  const allowed = await canViewPatientAsync(patient as any, user);
  if (!allowed) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }
  const [visitRecordCount, prescriptionCount] = await Promise.all([
    VisitRecord.countDocuments({ patientId: patient._id }),
    Prescription.countDocuments({ patientId: patient._id }),
  ]);
  const fullName = [patient.firstName, patient.lastName].filter(Boolean).join(' ');
  const age = patient.dob
    ? Math.floor((Date.now() - new Date(patient.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : undefined;
  res.json({
    ...patient,
    fullName,
    age,
    email: patient.contactEmail,
    phone: patient.contactPhone,
    summary: {
      visitRecordCount,
      prescriptionCount,
    },
  });
}
