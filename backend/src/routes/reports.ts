import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as reportsController from '../controllers/reportsController';

const router = Router();
router.use(authMiddleware);
router.post('/patients/:id/reports', reportsController.uploadMiddleware.single('file'), reportsController.uploadReport);
router.get('/patients/:id/reports', reportsController.listReports);
export default router;
