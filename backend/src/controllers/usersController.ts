import { Request, Response } from 'express';
import { z } from 'zod';
import { User } from '../models/User';
import * as authService from '../services/auth';
import * as otpService from '../services/otp';

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6).optional(), // optional: if omitted, user gets OTP to verify and set password
  role: z.enum(['RECEPTIONIST', 'DOCTOR', 'SUPER_ADMIN']),
  specialization: z.string().optional(),
  clinicId: z.string().min(1).optional(), // required for DOCTOR and RECEPTIONIST
  sendVerificationOtp: z.boolean().optional().default(true), // when true, create as PENDING_VERIFICATION and send OTP
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING_VERIFICATION']).optional(),
  specialization: z.string().optional(),
});

export async function createUser(req: Request, res: Response): Promise<void> {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid input', errors: parsed.error.flatten() });
    return;
  }
  const existing = await User.findOne({ email: parsed.data.email.toLowerCase() });
  if (existing) {
    res.status(409).json({ message: 'User with this email already exists' });
    return;
  }
  const email = parsed.data.email.toLowerCase();
  const sendOtp = parsed.data.sendVerificationOtp !== false;

  const clinicId = parsed.data.clinicId || undefined;
  if (sendOtp) {
    // Create user as PENDING_VERIFICATION; no password until they verify with OTP
    const user = await User.create({
      name: parsed.data.name,
      email,
      passwordHash: await authService.hashPassword('pending_' + Date.now()), // placeholder until verify
      role: parsed.data.role,
      status: 'PENDING_VERIFICATION',
      specialization: parsed.data.specialization,
      clinicId: clinicId || undefined,
    });
    let otpMessage = 'User created. OTP sent to email for verification.';
    try {
      await otpService.createAndSendOTP(email, parsed.data.name);
    } catch (e) {
      otpMessage =
        'User created. Verification email could not be sent (check server mail config). User can use "Resend OTP" later.';
    }
    const { passwordHash: _, ...rest } = user.toObject();
    res.status(201).json({ ...rest, message: otpMessage });
    return;
  }

  // Legacy: create with password, no OTP (e.g. for seed or internal use)
  const password = parsed.data.password || 'ChangeMe123!';
  const passwordHash = await authService.hashPassword(password);
  const user = await User.create({
    name: parsed.data.name,
    email,
    passwordHash,
    role: parsed.data.role,
    status: 'ACTIVE',
    specialization: parsed.data.specialization,
    clinicId: clinicId || undefined,
  });
  const { passwordHash: __, ...rest } = user.toObject();
  res.status(201).json(rest);
}

export async function listUsers(req: Request, res: Response): Promise<void> {
  const role = req.query.role as string | undefined;
  const status = req.query.status as string | undefined;
  const clinicId = req.query.clinicId as string | undefined;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
  const skip = (page - 1) * limit;
  const filter: Record<string, unknown> = {};
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (clinicId) filter.clinicId = clinicId;
  const [users, total] = await Promise.all([
    User.find(filter).select('-passwordHash').populate('clinicId', 'name').skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);
  res.json({ data: users, total, page, limit });
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid input' });
    return;
  }
  const user = await User.findByIdAndUpdate(req.params.id, { $set: parsed.data }, { new: true }).select('-passwordHash');
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }
  res.json(user);
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
  const id = req.params.id;
  const user = await User.findByIdAndDelete(id);
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }
  res.status(204).send();
}
