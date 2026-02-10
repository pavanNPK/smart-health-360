import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as exportController from '../controllers/exportController';

const router = Router();
router.use(authMiddleware);
router.post('/patients/:id/export', exportController.exportRecords);
export default router;
