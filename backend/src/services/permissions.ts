import { AuthUser } from '../middleware/auth';
import { IPatient } from '../models/Patient';
import { IRecord } from '../models/Record';

export function canViewPatient(patient: IPatient, user: AuthUser): boolean {
  if (user.role === 'SUPER_ADMIN') return true;
  if (user.role === 'RECEPTIONIST') return true;
  if (user.role === 'DOCTOR') {
    return patient.primaryDoctorId?.toString() === user.id;
  }
  return false;
}

export function canViewRecord(record: IRecord, patient: IPatient, user: AuthUser): boolean {
  if (record.visibility === 'PUBLIC') {
    return ['RECEPTIONIST', 'DOCTOR', 'SUPER_ADMIN'].includes(user.role);
  }
  if (record.visibility === 'PRIVATE') {
    if (user.role === 'RECEPTIONIST') return false;
    if (user.role === 'DOCTOR') {
      return (
        record.assignedDoctorId?.toString() === user.id ||
        patient.primaryDoctorId?.toString() === user.id
      );
    }
    if (user.role === 'SUPER_ADMIN') return true;
  }
  return false;
}

export function canExportPrivate(patient: IPatient, user: AuthUser): boolean {
  if (user.role === 'SUPER_ADMIN') return true;
  if (user.role === 'DOCTOR') return patient.primaryDoctorId?.toString() === user.id;
  return false;
}

export function canChangeVisibility(patient: IPatient, user: AuthUser): boolean {
  if (user.role === 'SUPER_ADMIN') return true;
  if (user.role === 'DOCTOR') return patient.primaryDoctorId?.toString() === user.id;
  return false;
}
