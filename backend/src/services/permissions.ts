import { AuthUser } from '../middleware/auth';
import { IPatient } from '../models/Patient';
import { IRecord } from '../models/Record';

/** Get id as string from a ref (ObjectId or populated doc). */
function refId(ref: unknown): string | undefined {
  if (ref == null) return undefined;
  const o = ref as { _id?: unknown; toString?: () => string };
  if (o._id != null) return (o._id as { toString: () => string }).toString?.() ?? String(o._id);
  return (ref as { toString: () => string }).toString?.() ?? String(ref);
}

function getPrimaryDoctorId(patient: IPatient): string | undefined {
  return refId(patient.primaryDoctorId);
}

export function canViewPatient(patient: IPatient, user: AuthUser): boolean {
  if (user.role === 'SUPER_ADMIN') return true;
  if (user.role === 'RECEPTIONIST') return true;
  if (user.role === 'DOCTOR') {
    const primaryId = getPrimaryDoctorId(patient);
    return primaryId === user.id || primaryId === undefined;
  }
  return false;
}

export function canViewRecord(record: IRecord, patient: IPatient, user: AuthUser): boolean {
  if (record.visibility === 'VIS_A') {
    return ['RECEPTIONIST', 'DOCTOR', 'SUPER_ADMIN'].includes(user.role);
  }
  if (record.visibility === 'VIS_B') {
    if (user.role === 'RECEPTIONIST') return false;
    if (user.role === 'DOCTOR') {
      return refId(record.assignedDoctorId) === user.id || getPrimaryDoctorId(patient) === user.id;
    }
    if (user.role === 'SUPER_ADMIN') return true;
  }
  return false;
}

export function canExportVisB(patient: IPatient, user: AuthUser): boolean {
  if (user.role === 'SUPER_ADMIN') return true;
  if (user.role === 'DOCTOR') return getPrimaryDoctorId(patient) === user.id;
  return false;
}

export function canChangeVisibility(patient: IPatient, user: AuthUser): boolean {
  if (user.role === 'SUPER_ADMIN') return true;
  if (user.role === 'DOCTOR') {
    const primaryId = getPrimaryDoctorId(patient);
    return primaryId === user.id || primaryId === undefined;
  }
  if (user.role === 'RECEPTIONIST') return canViewPatient(patient, user);
  return false;
}
