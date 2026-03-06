/**
 * Seed script for Patient Details module: creates demo patient, visit records,
 * prescriptions, and attachments so you can see data in the tabbed UI.
 *
 * Prerequisites:
 * - Backend .env has DB_URL set.
 * - At least one RECEPTIONIST and one DOCTOR user exist (create via app or seedAdmin + UI).
 *
 * Run: npx ts-node src/scripts/seedPatientDetailsDemo.ts
 *
 * Then: open Patients list, click the eye icon on "Demo Patient" to open Patient Details (tabs).
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Patient } from '../models/Patient';
import { VisitRecord } from '../models/VisitRecord';
import { Prescription } from '../models/Prescription';
import { PatientAttachment } from '../models/PatientAttachment';

const DEMO_FIRST_NAME = 'Demo';
const DEMO_LAST_NAME = 'Patient';
const DEMO_EMAIL = 'demo.patient.details@example.com';
const DEMO_PHONE = '+919876543210';

async function seed() {
  if (!process.env.DB_URL) {
    console.error('DB_URL is not set in .env');
    process.exit(1);
  }
  await mongoose.connect(process.env.DB_URL);
  console.log('Connected to MongoDB');

  const doctor = await User.findOne({ role: 'DOCTOR', status: 'ACTIVE' }).select('_id name').lean();
  const receptionist = await User.findOne({ role: 'RECEPTIONIST', status: 'ACTIVE' }).select('_id name').lean();
  if (!doctor || !receptionist) {
    console.error('Need at least one DOCTOR and one RECEPTIONIST user. Create them in the app first.');
    process.exit(1);
  }
  console.log('Using doctor:', doctor.name, '| receptionist:', receptionist.name);

  // Normalize phone for uniqueness (digits only)
  const phoneNorm = DEMO_PHONE.replace(/\D/g, '');
  let patientId: mongoose.Types.ObjectId;
  const existing = await Patient.findOne({
    $or: [
      { firstName: DEMO_FIRST_NAME, lastName: DEMO_LAST_NAME },
      { contactEmail: DEMO_EMAIL },
      { contactPhoneNormalized: phoneNorm },
    ],
  }).lean();

  if (!existing) {
    const created = await Patient.create({
      firstName: DEMO_FIRST_NAME,
      lastName: DEMO_LAST_NAME,
      dob: new Date('1985-06-15'),
      gender: 'M',
      contactEmail: DEMO_EMAIL,
      contactPhone: DEMO_PHONE,
      contactPhoneNormalized: phoneNorm,
      patientVisibility: 'VIS_A',
      primaryDoctorId: doctor._id,
      createdBy: receptionist._id,
    });
    patientId = created._id;
    console.log('Created patient:', created.firstName, created.lastName, 'id:', patientId.toString());
  } else {
    patientId = existing._id;
    console.log('Using existing patient:', existing.firstName, existing.lastName, 'id:', patientId.toString());
  }

  // Visit records
  const existingVisits = await VisitRecord.countDocuments({ patientId });
  if (existingVisits === 0) {
    await VisitRecord.insertMany([
      {
        patientId,
        visitType: 'NEW',
        visitedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        diseaseSummary: 'Fever and cold',
        diagnosis: 'Viral URTI',
        treatedByDoctorId: doctor._id,
        prescribedMedicinesSummary: 'Paracetamol, Antihistamine',
        notes: 'Rest and fluids. Follow up if fever persists.',
        createdByRole: 'RECEPTIONIST',
        createdByUserId: receptionist._id,
      },
      {
        patientId,
        visitType: 'FOLLOWUP',
        visitedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        diseaseSummary: 'Follow-up for URTI',
        diagnosis: 'Recovered',
        treatedByDoctorId: doctor._id,
        notes: 'Symptoms resolved.',
        createdByRole: 'RECEPTIONIST',
        createdByUserId: receptionist._id,
      },
      {
        patientId,
        visitType: 'CONTINUATION',
        visitedAt: new Date(),
        diseaseSummary: 'Routine check',
        diagnosis: 'Stable',
        treatedByDoctorId: doctor._id,
        createdByRole: 'RECEPTIONIST',
        createdByUserId: receptionist._id,
      },
    ]);
    console.log('Created 3 visit records');
  } else {
    console.log('Visit records already exist:', existingVisits);
  }

  // Prescriptions
  const existingRx = await Prescription.countDocuments({ patientId });
  if (existingRx === 0) {
    const rxDate = new Date();
    await Prescription.create({
      patientId,
      writtenByDoctorId: doctor._id,
      enteredByReceptionistId: receptionist._id,
      enteredAt: rxDate,
      prescriptionDate: rxDate,
      complaintSymptoms: 'Fever, cough',
      diagnosis: 'Viral URTI',
      medicines: [
        { name: 'Paracetamol', dosageText: '1-0-1', frequencyPerDay: 2, days: 5, beforeFood: false, instructions: 'After food' },
        { name: 'Cetirizine', dosageText: '0-0-1', days: 5, beforeFood: false },
      ],
      testsOrXray: [{ type: 'LAB', name: 'CBC', notes: 'If fever persists' }],
      followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'FINAL',
      doctorApproval: { approved: true, approvedAt: rxDate, approvedByDoctorId: doctor._id, remarks: 'OK' },
      createdByRole: 'RECEPTIONIST',
    });
    await Prescription.create({
      patientId,
      writtenByDoctorId: doctor._id,
      enteredByReceptionistId: receptionist._id,
      enteredAt: rxDate,
      prescriptionDate: rxDate,
      complaintSymptoms: 'Mild headache',
      diagnosis: 'Tension headache',
      medicines: [{ name: 'Paracetamol', dosageText: '1-0-0', days: 2, beforeFood: false }],
      testsOrXray: [],
      status: 'DRAFT',
      createdByRole: 'RECEPTIONIST',
    });
    console.log('Created 2 prescriptions (1 FINAL, 1 DRAFT)');
  } else {
    console.log('Prescriptions already exist:', existingRx);
  }

  // Attachments (medicine/xray metadata)
  const existingAtt = await PatientAttachment.countDocuments({ patientId });
  if (existingAtt === 0) {
    await PatientAttachment.insertMany([
      {
        patientId,
        category: 'XRAY',
        name: 'Chest X-Ray',
        description: 'PA view',
        fileUrl: 'https://example.com/reports/chest-xray-placeholder.pdf',
        createdBy: receptionist._id,
        createdByRole: 'RECEPTIONIST',
      },
      {
        patientId,
        category: 'LAB_REPORT',
        name: 'CBC Report',
        description: 'Complete blood count',
        createdBy: receptionist._id,
        createdByRole: 'RECEPTIONIST',
      },
    ]);
    console.log('Created 2 attachments');
  } else {
    console.log('Attachments already exist:', existingAtt);
  }

  console.log('\n--- Done ---');
  console.log('Patient ID:', patientId.toString());
  console.log('Open: http://localhost:4200/reception/patients (or /admin/patients, /doctor/patients)');
  console.log('Click the eye icon on "' + DEMO_FIRST_NAME + ' ' + DEMO_LAST_NAME + '" to open Patient Details with tabs.');
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
