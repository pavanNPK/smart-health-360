import { Request, Response } from 'express';
import { z } from 'zod';
import { User } from '../models/User';
import { Clinic } from '../models/Clinic';
import * as authService from '../services/auth';
import * as otpService from '../services/otp';

async function getClinicWithArea(clinicId: string | undefined): Promise<{ id: string; name: string; areaName: string } | undefined> {
  if (!clinicId || String(clinicId).trim() === '') return undefined;
  const id = String(clinicId).trim();
  const clinic = await Clinic.findById(id).populate('areaId', 'name').lean();
  if (!clinic) return undefined;
  const area = clinic.areaId as { _id: unknown; name?: string } | null;
  const areaName = area && typeof area === 'object' && area.name != null ? String(area.name) : '';
  return {
    id: clinic._id.toString(),
    name: clinic.name ?? '',
    areaName,
  };
}

export async function me(req: Request, res: Response): Promise<void> {
  const user = await User.findById(req.user!.id).select('-passwordHash').lean();
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }
  const rawClinicId = user.clinicId;
  const clinicId = rawClinicId != null ? String(rawClinicId) : undefined;
  const clinic = await getClinicWithArea(clinicId);
  res.json({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    clinicId: clinicId ?? undefined,
    clinic: clinic ?? undefined,
  });
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const sendOtpSchema = z.object({
  email: z.string().email(),
});

const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  password: z.string().min(6),
});

export async function login(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid input', errors: parsed.error.flatten() });
    return;
  }
  const { email, password } = parsed.data;
  const result = await authService.login(email, password);
  if (result.ok === false) {
    if (result.code === 'EMAIL_NOT_VERIFIED') {
      res.status(403).json({ code: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email with the OTP sent to your inbox.' });
      return;
    }
    res.status(401).json({ message: 'Invalid email or password' });
    return;
  }
  const userPayload = result.user as { id: string; name: string; email: string; role: string; clinicId?: string };
  const clinic = await getClinicWithArea(userPayload.clinicId);
  res.json({
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    user: { ...userPayload, clinic },
  });
}

export async function sendOtp(req: Request, res: Response): Promise<void> {
  const parsed = sendOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid input' });
    return;
  }
  const email = parsed.data.email.toLowerCase();
  const user = await User.findOne({ email, status: 'PENDING_VERIFICATION' });
  if (!user) {
    res.status(404).json({ message: 'No pending verification found for this email.' });
    return;
  }
  await otpService.createAndSendOTP(email, user.name);
  res.json({ message: 'OTP sent to your email.' });
}

export async function verifyOtp(req: Request, res: Response): Promise<void> {
  const parsed = verifyOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid input', errors: parsed.error.flatten() });
    return;
  }
  const { email, otp, password } = parsed.data;
  const result = await authService.verifyOtpAndSetPassword(email, otp, password);
  if (result.ok === false) {
    res.status(400).json({ code: result.code, message: result.code === 'INVALID_OR_EXPIRED_OTP' ? 'Invalid or expired OTP.' : 'User not found.' });
    return;
  }
  const userPayload = result.user as { id: string; name: string; email: string; role: string; clinicId?: string };
  const clinic = await getClinicWithArea(userPayload.clinicId);
  res.json({
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    user: { ...userPayload, clinic },
  });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid input' });
    return;
  }
  const result = await authService.refreshTokens(parsed.data.refreshToken);
  if (!result) {
    res.status(401).json({ message: 'Invalid refresh token' });
    return;
  }
  res.json(result);
}
