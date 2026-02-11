import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as authController from '../controllers/authController';

const router = Router();
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/send-otp', authController.sendOtp);
router.post('/verify-otp', authController.verifyOtp);
router.get('/me', authMiddleware, authController.me);
export default router;
