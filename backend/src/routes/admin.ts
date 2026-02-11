import { Router } from 'express';
import { authMiddleware, roleGuard } from '../middleware/auth';
import * as adminController from '../controllers/adminController';
import * as emergencyHideController from '../controllers/emergencyHideController';

const router = Router();
router.use(authMiddleware);
router.use(roleGuard('SUPER_ADMIN'));

router.get('/stats', adminController.getStats);
router.post('/emergency-hide', emergencyHideController.triggerEmergencyHide);
router.post('/emergency-restore', emergencyHideController.triggerEmergencyRestore);
router.get('/inspection-mode', emergencyHideController.getInspectionModeStatus);

export default router;
