/**
 * One-time migration: set contactPhoneNormalized for existing patients (for email/phone uniqueness).
 * Run from backend: npx ts-node src/scripts/migratePatientPhoneNormalized.ts
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { Patient } from '../models/Patient';

const DB_URL = process.env.DB_URL || '';

function normalizePhone(phone: string | undefined): string {
  if (!phone || typeof phone !== 'string') return '';
  return phone.replace(/\D/g, '');
}

async function run() {
  if (!DB_URL) {
    console.error('DB_URL not set in .env');
    process.exit(1);
  }
  await mongoose.connect(DB_URL);
  const patients = await Patient.find({ contactPhone: { $exists: true, $ne: '', $nin: [null] } }).lean();
  let updated = 0;
  let skipped = 0;
  for (const p of patients) {
    const doc = p as { _id: unknown; contactPhone?: string; contactPhoneNormalized?: string };
    if (doc.contactPhoneNormalized) {
      skipped++;
      continue;
    }
    const norm = normalizePhone(doc.contactPhone);
    if (!norm) continue;
    try {
      await Patient.updateOne({ _id: doc._id }, { $set: { contactPhoneNormalized: norm } });
      updated++;
    } catch (e) {
      console.warn('Duplicate or conflict for patient', doc._id, norm, (e as Error).message);
    }
  }
  console.log(`Backfilled contactPhoneNormalized: ${updated} updated, ${skipped} already set.`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
