import { Router } from 'express';
import { authMiddleware, roleGuard } from '../middleware/auth';
import * as importController from '../controllers/importController';

const router = Router();
router.use(authMiddleware);
router.use(roleGuard('RECEPTIONIST', 'SUPER_ADMIN'));
router.post('/patients/:id/import', importController.importRecords);
export default router;
