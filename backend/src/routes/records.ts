import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as recordsController from '../controllers/recordsController';

const router = Router();
router.use(authMiddleware);
router.post('/patients/:id/records', recordsController.createRecord);
router.get('/patients/:id/records/summary', recordsController.recordsSummary);
router.get('/patients/:id/records', recordsController.listRecords);
router.patch('/records/:recordId/visibility', recordsController.updateVisibility);
export default router;
