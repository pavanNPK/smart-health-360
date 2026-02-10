import crypto from 'crypto';
import { VerificationCode } from '../models/VerificationCode';
import { sendOTPEmail } from './mail';

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 15;

function generateOTP(): string {
  const digits = crypto.randomInt(0, Math.pow(10, OTP_LENGTH));
  return digits.toString().padStart(OTP_LENGTH, '0');
}

export async function createAndSendOTP(email: string, userName: string): Promise<string> {
  const code = generateOTP();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  await VerificationCode.deleteMany({ email, type: 'email_verification' });
  await VerificationCode.create({ email, code, type: 'email_verification', expiresAt });
  await sendOTPEmail(email, userName, code);
  return code;
}

export async function verifyOTP(email: string, code: string): Promise<boolean> {
  const record = await VerificationCode.findOne({
    email: email.toLowerCase(),
    code,
    type: 'email_verification',
    expiresAt: { $gt: new Date() },
  });
  if (!record) return false;
  await VerificationCode.deleteOne({ _id: record._id });
  return true;
}

export async function hasValidOTP(email: string): Promise<boolean> {
  const record = await VerificationCode.findOne({
    email: email.toLowerCase(),
    type: 'email_verification',
    expiresAt: { $gt: new Date() },
  });
  return !!record;
}
