import { Router } from 'express';
import * as authController from '../controllers/authController';

const router = Router();
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/send-otp', authController.sendOtp);
router.post('/verify-otp', authController.verifyOtp);
export default router;
