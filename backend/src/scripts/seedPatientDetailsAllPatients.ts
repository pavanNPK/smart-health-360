/**
 * Seed script: for every patient, create demo VisitRecord, Prescription and PatientAttachment
 * entries if they don't have any yet. This lets you test the Patient Details tabs
 * (Records, Prescription, Medicine/X-Ray Data) with lots of data.
 *
 * Run: npx ts-node src/scripts/seedPatientDetailsAllPatients.ts
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { Patient } from '../models/Patient';
import { User } from '../models/User';
import { VisitRecord } from '../models/VisitRecord';
import { Prescription } from '../models/Prescription';
import { PatientAttachment } from '../models/PatientAttachment';

async function seedForAllPatients() {
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

  const patients = await Patient.find({}).select('_id firstName lastName').lean();
  console.log('Total patients:', patients.length);

  for (const p of patients) {
    const patientId = p._id;
    const name = `${p.firstName} ${p.lastName}`;
    console.log('\n--- Patient:', name, '---');

    // Visit records
    const existingVisits = await VisitRecord.countDocuments({ patientId });
    if (existingVisits === 0) {
      await VisitRecord.insertMany([
        {
          patientId,
          visitType: 'NEW',
          visitedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          diseaseSummary: 'Fever and cold',
          diagnosis: 'Viral URTI',
          treatedByDoctorId: doctor._id,
          prescribedMedicinesSummary: 'Paracetamol, Antihistamine',
          notes: 'Rest and fluids.',
          createdByRole: 'RECEPTIONIST',
          createdByUserId: receptionist._id,
        },
        {
          patientId,
          visitType: 'FOLLOWUP',
          visitedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          diseaseSummary: 'Follow-up visit',
          diagnosis: 'Improving',
          treatedByDoctorId: doctor._id,
          notes: 'Better, continue meds.',
          createdByRole: 'RECEPTIONIST',
          createdByUserId: receptionist._id,
        },
      ]);
      console.log('  Added 2 visit records');
    } else {
      console.log('  Visit records already exist:', existingVisits);
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
        complaintSymptoms: 'Headache, mild fever',
        diagnosis: 'Viral infection',
        medicines: [
          { name: 'Paracetamol', dosageText: '1-0-1', frequencyPerDay: 2, days: 3, beforeFood: false },
          { name: 'Pantoprazole', dosageText: '1-0-0', days: 3, beforeFood: true },
        ],
        testsOrXray: [{ type: 'LAB', name: 'CBC', notes: '' }],
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
        complaintSymptoms: 'Back pain',
        diagnosis: 'Muscle spasm',
        medicines: [{ name: 'Ibuprofen', dosageText: '1-0-1', days: 5, beforeFood: false }],
        testsOrXray: [{ type: 'XRAY', name: 'Spine X-Ray', notes: 'If pain persists' }],
        status: 'DRAFT',
        createdByRole: 'RECEPTIONIST',
      });
      console.log('  Added 2 prescriptions');
    } else {
      console.log('  Prescriptions already exist:', existingRx);
    }

    // Attachments
    const existingAtt = await PatientAttachment.countDocuments({ patientId });
    if (existingAtt === 0) {
      await PatientAttachment.insertMany([
        {
          patientId,
          category: 'XRAY',
          name: 'Spine X-Ray',
          description: 'Lateral view',
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
      console.log('  Added 2 attachments');
    } else {
      console.log('  Attachments already exist:', existingAtt);
    }
  }

  console.log('\nDone seeding patient details for all patients.');
  process.exit(0);
}

seedForAllPatients().catch((e) => {
  console.error(e);
  process.exit(1);
});

