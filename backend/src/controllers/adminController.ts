import { Request, Response } from 'express';
import { User } from '../models/User';
import { Clinic } from '../models/Clinic';
import { Report } from '../models/Report';
import { Patient } from '../models/Patient';

export async function getStats(req: Request, res: Response): Promise<void> {
  const [doctors, receptionists, clinics, reports, patients] = await Promise.all([
    User.countDocuments({ role: 'DOCTOR' }),
    User.countDocuments({ role: 'RECEPTIONIST' }),
    Clinic.countDocuments({}),
    Report.countDocuments({}),
    Patient.countDocuments({}),
  ]);
  res.json({
    doctors,
    receptionists,
    clinics,
    reports,
    patients,
  });
}
