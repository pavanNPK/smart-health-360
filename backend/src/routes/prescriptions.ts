import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as prescriptionsController from '../controllers/prescriptionsController';

const router = Router();
router.use(authMiddleware);
router.put('/:id', prescriptionsController.updatePrescription);
export default router;
