import { Prescription } from '../models/Prescription';
import { Patient } from '../models/Patient';
import { notifyPrescriptionFinalized } from './notification';

export async function finalizePrescriptionAndNotify(prescriptionId: string): Promise<void> {
  const prescription = await Prescription.findById(prescriptionId)
    .populate('patientId')
    .lean();
  if (!prescription || !prescription.patientId) return;
  const patient = prescription.patientId as unknown as {
    contactEmail?: string;
    contactPhone?: string;
    firstName?: string;
    lastName?: string;
  };
  const patientName = [patient.firstName, patient.lastName].filter(Boolean).join(' ') || 'Patient';
  const prescriptionDate =
    prescription.prescriptionDate instanceof Date
      ? prescription.prescriptionDate.toISOString().slice(0, 10)
      : String(prescription.prescriptionDate).slice(0, 10);
  const summary =
    prescription.medicines?.length > 0
      ? `Medicines: ${prescription.medicines.map((m) => m.name).join(', ')}`
      : undefined;
  await notifyPrescriptionFinalized({
    patientEmail: patient.contactEmail,
    patientPhone: patient.contactPhone,
    patientName,
    prescriptionDate,
    prescriptionSummary: summary,
  });
}
