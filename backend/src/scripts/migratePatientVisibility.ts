/**
 * One-time migration: Patient isPrivatePatient (boolean) -> patientVisibility ('VIS_A' | 'VIS_B').
 * Run: npx ts-node src/scripts/migratePatientVisibility.ts
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { Patient } from '../models/Patient';

const DB_URL = process.env.DB_URL || '';

async function run() {
  if (!DB_URL) {
    console.error('DB_URL not set in .env');
    process.exit(1);
  }
  await mongoose.connect(DB_URL);
  const patients = await Patient.find({}).lean();
  let updated = 0;
  for (const p of patients) {
    const doc = p as Record<string, unknown>;
    if (doc.patientVisibility !== undefined) continue;
    const isPrivatePatient = doc.isPrivatePatient === true;
    await Patient.updateOne(
      { _id: p._id },
      {
        $set: { patientVisibility: isPrivatePatient ? 'VIS_B' : 'VIS_A' },
        $unset: { isPrivatePatient: 1 },
      }
    );
    updated++;
  }
  console.log(`Migrated ${updated} patients (isPrivatePatient -> patientVisibility).`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
