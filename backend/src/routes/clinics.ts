import { Router } from 'express';
import { authMiddleware, roleGuard } from '../middleware/auth';
import * as clinicsController from '../controllers/clinicsController';

const router = Router();
router.use(authMiddleware);
// list: SA, Doctor, Receptionist (Doctor/Receptionist get own clinic only)
router.get('/', clinicsController.listClinics);
router.get('/:id/doctors', clinicsController.getClinicDoctors);
router.get('/:id/receptionists', clinicsController.getClinicReceptionists);
// create: SA only
router.post('/', roleGuard('SUPER_ADMIN'), clinicsController.createClinic);
router.patch('/:id', roleGuard('SUPER_ADMIN'), clinicsController.updateClinic);
export default router;
