/**
 * Run: npx ts-node src/scripts/seedAdmin.ts
 * Creates a Super Admin user if none exists. Use for initial setup.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../models/User';
import * as authService from '../services/auth';

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@smarthealth360.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Admin123SH!';
const ADMIN_NAME = process.env.SEED_ADMIN_NAME || 'Super Admin';

async function seed() {
  await mongoose.connect(process.env.DB_URL!);
  const existing = await User.findOne({ role: 'SUPER_ADMIN' });
  if (existing) {
    console.log('Super Admin already exists:', existing.email);
    process.exit(0);
    return;
  }
  const passwordHash = await authService.hashPassword(ADMIN_PASSWORD);
  await User.create({
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    passwordHash,
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
  });
  console.log('Super Admin created:', ADMIN_EMAIL);
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
