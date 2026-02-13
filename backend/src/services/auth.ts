import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { AuthUser } from '../middleware/auth';
import { logAudit } from './audit';
import { sendWelcomeEmail } from './mail';

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signAccessToken(user: AuthUser & { email?: string; clinicId?: string }): string {
  const secret = process.env.JWT_SECRET as string;
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email, clinicId: user.clinicId },
    secret,
    { expiresIn: process.env.JWT_EXPIRES || '24h' } as jwt.SignOptions
  );
}

export function signRefreshToken(userId: string): string {
  const secret = process.env.REFRESH_TOKEN_SECRET as string;
  return jwt.sign(
    { id: userId },
    secret,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRE || '7d' } as jwt.SignOptions
  );
}

export function verifyRefreshToken(token: string): { id: string } {
  return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET!) as { id: string };
}

export type LoginResult =
  | { ok: true; accessToken: string; refreshToken: string; user: { id: string; name: string; email: string; role: string; clinicId?: string } }
  | { ok: false; code: 'EMAIL_NOT_VERIFIED' }
  | { ok: false; code: 'INVALID_CREDENTIALS' };

export async function login(email: string, password: string): Promise<LoginResult> {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return { ok: false, code: 'INVALID_CREDENTIALS' };
  if (user.status === 'PENDING_VERIFICATION') return { ok: false, code: 'EMAIL_NOT_VERIFIED' };
  if (user.status !== 'ACTIVE') return { ok: false, code: 'INVALID_CREDENTIALS' };
  if (!user.passwordHash) return { ok: false, code: 'INVALID_CREDENTIALS' };
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return { ok: false, code: 'INVALID_CREDENTIALS' };
  const clinicId = user.clinicId?.toString();
  const payload: AuthUser & { email?: string; clinicId?: string } = { id: user._id.toString(), role: user.role, email: user.email, clinicId };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(user._id.toString());
  await logAudit('LOGIN', user._id.toString(), { details: { email: user.email } });
  return {
    ok: true,
    accessToken,
    refreshToken,
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      clinicId: clinicId ?? undefined,
    },
  };
}

export async function verifyOtpAndSetPassword(
  email: string,
  otp: string,
  newPassword: string
): Promise<{ ok: true; accessToken: string; refreshToken: string; user: { id: string; name: string; email: string; role: string; clinicId?: string } } | { ok: false; code: string }> {
  const { verifyOTP } = await import('./otp');
  const valid = await verifyOTP(email, otp);
  if (!valid) return { ok: false, code: 'INVALID_OR_EXPIRED_OTP' };
  const user = await User.findOne({ email: email.toLowerCase(), status: 'PENDING_VERIFICATION' });
  if (!user) return { ok: false, code: 'USER_NOT_FOUND' };
  user.passwordHash = await hashPassword(newPassword);
  user.status = 'ACTIVE';
  await user.save();
  sendWelcomeEmail(user.name, user.email).catch((err) => console.error('Welcome email failed:', err));
  const clinicId = user.clinicId?.toString();
  const payload: AuthUser & { email?: string; clinicId?: string } = { id: user._id.toString(), role: user.role, email: user.email, clinicId };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(user._id.toString());
  await logAudit('LOGIN', user._id.toString(), { details: { email: user.email, verified: true } });
  return {
    ok: true,
    accessToken,
    refreshToken,
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      clinicId: clinicId ?? undefined,
    },
  };
}

export async function refreshTokens(refreshToken: string): Promise<{
  accessToken: string;
} | null> {
  try {
    const { id } = verifyRefreshToken(refreshToken);
    const user = await User.findById(id);
    if (!user || user.status !== 'ACTIVE') return null;
    const clinicId = user.clinicId?.toString();
    const payload: AuthUser & { email?: string; clinicId?: string } = { id: user._id.toString(), role: user.role, email: user.email, clinicId };
    return { accessToken: signAccessToken(payload) };
  } catch {
    return null;
  }
}
