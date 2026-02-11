import { Router } from 'express';
import { authMiddleware, roleGuard } from '../middleware/auth';
import * as emergencyHideController from '../controllers/emergencyHideController';

const router = Router();
router.use(authMiddleware);
router.use(roleGuard('SUPER_ADMIN'));

router.post('/emergency-hide', emergencyHideController.triggerEmergencyHide);
router.post('/emergency-restore', emergencyHideController.triggerEmergencyRestore);
router.get('/inspection-mode', emergencyHideController.getInspectionModeStatus);

export default router;
