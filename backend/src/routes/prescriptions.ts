import { Router } from 'express';
import { authMiddleware, roleGuard } from '../middleware/auth';
import * as prescriptionsController from '../controllers/prescriptionsController';

const router = Router();
router.use(authMiddleware);
router.get('/pending-approval', roleGuard('DOCTOR'), prescriptionsController.listPendingApproval);
router.put('/:id', prescriptionsController.updatePrescription);
export default router;
