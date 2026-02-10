import { Router } from 'express';
import { authMiddleware, roleGuard } from '../middleware/auth';
import * as auditController from '../controllers/auditController';

const router = Router();
router.use(authMiddleware);
router.use(roleGuard('SUPER_ADMIN'));
router.get('/', auditController.listAuditLogs);
export default router;
