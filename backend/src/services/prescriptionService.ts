import { Prescription } from '../models/Prescription';
import { sendPrescriptionFinalizedEmail } from './mail';
import { notifyPrescriptionWhatsApp } from './notification';

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
  const followUpStr = prescription.followUpDate
    ? prescription.followUpDate instanceof Date
      ? prescription.followUpDate.toISOString().slice(0, 10)
      : String(prescription.followUpDate).slice(0, 10)
    : undefined;
  if (patient.contactEmail) {
    sendPrescriptionFinalizedEmail(patient.contactEmail, patientName, prescriptionDate, {
      complaintSymptoms: prescription.complaintSymptoms,
      diagnosis: prescription.diagnosis,
      medicines: prescription.medicines,
      testsOrXray: prescription.testsOrXray?.map((t) => ({ type: t.type, name: t.name })),
      followUpDate: followUpStr,
    }).catch((err) => console.error('Prescription email failed:', err));
  }
  if (patient.contactPhone) {
    notifyPrescriptionWhatsApp({ patientPhone: patient.contactPhone, patientName, prescriptionDate }).catch((err) =>
      console.error('Prescription WhatsApp failed:', err)
    );
  }
}
