import { Router } from 'express';
import { authMiddleware, roleGuard } from '../middleware/auth';
import * as auditController from '../controllers/auditController';

const router = Router();
router.use(authMiddleware);
// SA: all audits; Doctor: self + clinic receptionists; Receptionist: self only
router.get('/', roleGuard('SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST'), auditController.listAuditLogs);
export default router;
