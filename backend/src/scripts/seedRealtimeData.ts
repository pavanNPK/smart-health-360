/**
 * Seed real interconnected data: areas, clinics, doctors, receptionists, patients, records.
 * Removes existing data EXCEPT Super Admin users, then creates plenty of new records.
 *
 * Run: npx ts-node src/scripts/seedRealtimeData.ts
 * Seeded doctor/receptionist password: Password123!
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { Area } from '../models/Area';
import { Clinic } from '../models/Clinic';
import { User } from '../models/User';
import { Patient } from '../models/Patient';
import { Record } from '../models/Record';
import { Report } from '../models/Report';
import { ReceptionistAttendance } from '../models/ReceptionistAttendance';
import * as authService from '../services/auth';

const SEED_PASSWORD = 'Password123!';

const AREA_NAMES = [
  { name: 'North District', code: 'NRTH' },
  { name: 'South District', code: 'STH' },
  { name: 'East District', code: 'EST' },
  { name: 'West District', code: 'WST' },
  { name: 'Central District', code: 'CNTR' },
];

const CLINIC_NAMES_BY_AREA: Record<string, string[]> = {
  'North District': ['North City Clinic', 'North Valley Medical', 'North Hills Health'],
  'South District': ['South Metro Clinic', 'South Riverside Medical'],
  'East District': ['East Park Clinic', 'East Side Family Health', 'Eastwood Medical'],
  'West District': ['West Gate Clinic', 'West End Health Center'],
  'Central District': ['Central Hospital OPD', 'Central Polyclinic', 'Downtown Medical'],
};

const DOCTOR_NAMES = [
  'Dr. Rajesh Kumar', 'Dr. Priya Sharma', 'Dr. Amit Patel', 'Dr. Sneha Reddy',
  'Dr. Vikram Singh', 'Dr. Anjali Nair', 'Dr. Suresh Iyer', 'Dr. Meera Krishnan',
  'Dr. Karthik Rao', 'Dr. Divya Menon', 'Dr. Ravi Verma', 'Dr. Lakshmi Pillai',
  'Dr. Arjun Nambiar', 'Dr. Pooja Gupta', 'Dr. Sanjay Joshi',
];

const RECEPTIONIST_NAMES = [
  'Maria Santos', 'James Wilson', 'Linda Chen', 'Robert Brown', 'Jennifer Lee',
  'Michael Davis', 'Sarah Johnson', 'David Martinez', 'Emily Garcia', 'Daniel Taylor',
  'Jessica Anderson', 'Christopher Thomas', 'Amanda White', 'Matthew Harris', 'Ashley Clark',
];

const PATIENT_FIRST = [
  'Ramesh', 'Lakshmi', 'Suresh', 'Kavitha', 'Venkat', 'Geeta', 'Mohan', 'Padma',
  'Krishna', 'Anita', 'Gopal', 'Sunita', 'Ravi', 'Vijaya', 'Srinivas', 'Lalitha',
  'Prakash', 'Usha', 'Murugan', 'Devi', 'Chandran', 'Malini', 'Balaji', 'Revathi',
  'Arun', 'Prema', 'Manohar', 'Shanti', 'Subramanian', 'Kamala',
];

const PATIENT_LAST = [
  'Reddy', 'Naidu', 'Rao', 'Murthy', 'Krishnan', 'Pillai', 'Nair', 'Menon',
  'Iyengar', 'Sharma', 'Gupta', 'Patel', 'Singh', 'Verma', 'Khan', 'Joshi',
];

const RECORD_TYPES: Array<'diagnosis' | 'medication' | 'note' | 'lab' | 'report' | 'attachment'> = ['diagnosis', 'medication', 'note', 'lab', 'report', 'attachment'];
const DISEASES = ['Hypertension', 'Type 2 Diabetes', 'Asthma', 'COPD', 'Arthritis', 'Migraine', 'Anemia', 'UTI', 'GERD', 'Anxiety'];
const VISIBILITIES: Array<'VIS_A' | 'VIS_B'> = ['VIS_A', 'VIS_B'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(yearsAgo: number): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - Math.floor(Math.random() * yearsAgo));
  d.setMonth(Math.floor(Math.random() * 12));
  d.setDate(1 + Math.floor(Math.random() * 28));
  return d;
}

async function wipe() {
  console.log('Wiping existing data (keeping Super Admin)...');
  await Record.deleteMany({});
  await Report.deleteMany({});
  await Patient.deleteMany({});
  await ReceptionistAttendance.deleteMany({});
  await User.deleteMany({ role: { $ne: 'SUPER_ADMIN' } });
  await Clinic.deleteMany({});
  await Area.deleteMany({});
  console.log('Wipe done.');
}

async function seed() {
  await mongoose.connect(process.env.DB_URL!);

  await wipe();

  const passwordHash = await authService.hashPassword(SEED_PASSWORD);

  // 1. Areas
  const areas = await Area.insertMany(AREA_NAMES);
  console.log('Created', areas.length, 'areas.');

  // 2. Clinics (per area)
  const clinics: mongoose.Types.ObjectId[] = [];
  for (const area of areas) {
    const names = CLINIC_NAMES_BY_AREA[area.name] || [`${area.name} Clinic`];
    for (const name of names) {
      const [c] = await Clinic.insertMany([{ name, areaId: area._id, code: name.replace(/\s/g, '').slice(0, 8) }]);
      clinics.push(c._id);
    }
  }
  console.log('Created', clinics.length, 'clinics.');

  // 3. Doctors and Receptionists per clinic (2–3 each); track per clinic for patients
  const clinicToDoctors = new Map<string, mongoose.Types.ObjectId[]>();
  const clinicToRecs = new Map<string, mongoose.Types.ObjectId[]>();
  let docIndex = 0;
  let recIndex = 0;
  const todayStart = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z');

  for (const clinicId of clinics) {
    const docIds: mongoose.Types.ObjectId[] = [];
    const recIds: mongoose.Types.ObjectId[] = [];
    const numDoctors = 2 + Math.floor(Math.random() * 2);
    const numRec = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < numDoctors && docIndex < DOCTOR_NAMES.length; i++) {
      const name = DOCTOR_NAMES[docIndex];
      const [u] = await User.insertMany([{
        name,
        email: `doctor.${docIndex + 1}@clinic${clinicId.toString().slice(-4)}.demo`,
        passwordHash,
        role: 'DOCTOR',
        status: 'ACTIVE',
        specialization: pick(['General Medicine', 'Cardiology', 'Pediatrics', 'Orthopedics', 'Dermatology']),
        clinicId,
      }]);
      docIds.push(u._id);
      docIndex++;
    }
    for (let i = 0; i < numRec && recIndex < RECEPTIONIST_NAMES.length; i++) {
      const name = RECEPTIONIST_NAMES[recIndex];
      const [u] = await User.insertMany([{
        name,
        email: `receptionist.${recIndex + 1}@clinic${clinicId.toString().slice(-4)}.demo`,
        passwordHash,
        role: 'RECEPTIONIST',
        status: 'ACTIVE',
        clinicId,
      }]);
      recIds.push(u._id);
      await ReceptionistAttendance.create({
        userId: u._id,
        date: todayStart,
        status: Math.random() > 0.2 ? 'PRESENT' : 'ABSENT',
        notes: Math.random() > 0.7 ? 'Shift 9–5' : undefined,
      });
      recIndex++;
    }
    clinicToDoctors.set(clinicId.toString(), docIds);
    clinicToRecs.set(clinicId.toString(), recIds);
  }
  const totalDoctors = Array.from(clinicToDoctors.values()).reduce((s, a) => s + a.length, 0);
  const totalRecs = Array.from(clinicToRecs.values()).reduce((s, a) => s + a.length, 0);
  console.log('Created', totalDoctors, 'doctors,', totalRecs, 'receptionists.');

  // 4. Patients per clinic (created by receptionists, assigned to doctors of same clinic)
  const patientIds: mongoose.Types.ObjectId[] = [];
  const patientToDoctor = new Map<string, mongoose.Types.ObjectId>();

  for (const clinicId of clinics) {
    const doctors = clinicToDoctors.get(clinicId.toString()) || [];
    const recs = clinicToRecs.get(clinicId.toString()) || [];
    if (doctors.length === 0 || recs.length === 0) continue;
    const numPatients = 12 + Math.floor(Math.random() * 18);
    for (let i = 0; i < numPatients; i++) {
      const primaryDoctorId = pick(doctors);
      const createdBy = pick(recs);
      const [p] = await Patient.insertMany([{
        firstName: pick(PATIENT_FIRST),
        lastName: pick(PATIENT_LAST),
        dob: randomDate(70),
        gender: pick(['M', 'F', 'O']),
        contactEmail: `patient.${patientIds.length + 1}@example.com`,
        contactPhone: '+91' + String(9000000000 + Math.floor(Math.random() * 999999999)).slice(0, 10),
        address: `${pick([1, 2, 3, 4, 5]) * 10} Main Street`,
        patientVisibility: pick(VISIBILITIES),
        primaryDoctorId,
        createdBy,
      }]);
      patientIds.push(p._id);
      patientToDoctor.set(p._id.toString(), primaryDoctorId);
    }
  }
  console.log('Created', patientIds.length, 'patients.');

  // 5. Records per patient (4–10 each), mix of VIS_A and VIS_B so "VIS_A / VIS_B records" is never 0/0
  let recordCount = 0;
  for (const patientId of patientIds) {
    const doctorId = patientToDoctor.get(patientId.toString())!;
    const numRecords = 4 + Math.floor(Math.random() * 7);
    for (let i = 0; i < numRecords; i++) {
      const visibility = i % 2 === 0 ? 'VIS_A' : 'VIS_B'; // ensure both VIS_A and VIS_B so counts are non-zero
      await Record.create({
        patientId,
        createdBy: doctorId,
        assignedDoctorId: doctorId,
        visibility,
        type: pick(RECORD_TYPES),
        title: `${pick(DISEASES)} - ${pick(['Initial', 'Follow-up', 'Review'])}`,
        disease: pick(DISEASES),
        notes: 'Seeded note for demo.',
      });
      recordCount++;
    }
  }
  console.log('Created', recordCount, 'records.');

  console.log('\nDone. Seeded doctor/receptionist password:', SEED_PASSWORD);
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
