import { Router } from 'express';
import { authMiddleware, roleGuard } from '../middleware/auth';
import * as areasController from '../controllers/areasController';

const router = Router();
router.use(authMiddleware);
router.use(roleGuard('SUPER_ADMIN'));
router.post('/', areasController.createArea);
router.get('/', areasController.listAreas);
export default router;
