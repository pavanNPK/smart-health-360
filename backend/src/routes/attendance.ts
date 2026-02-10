import { Router } from 'express';
import { authMiddleware, roleGuard } from '../middleware/auth';
import * as attendanceController from '../controllers/attendanceController';

const router = Router();
router.use(authMiddleware);
router.use(roleGuard('SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST'));
router.get('/', attendanceController.getAttendance);
router.post('/', attendanceController.setAttendance);
export default router;