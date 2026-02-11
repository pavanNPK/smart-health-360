import { Router } from 'express';
import { authMiddleware, roleGuard } from '../middleware/auth';
import * as patientsController from '../controllers/patientsController';

const router = Router();
router.use(authMiddleware);
router.post('/', roleGuard('RECEPTIONIST'), patientsController.createPatient);
router.get('/', patientsController.listPatients);
router.get('/stats', patientsController.patientStats);
router.get('/:id', patientsController.getPatient);
router.patch('/:id', roleGuard('RECEPTIONIST', 'SUPER_ADMIN'), patientsController.updatePatient);
router.delete('/:id', roleGuard('RECEPTIONIST', 'SUPER_ADMIN'), patientsController.deletePatient);
router.patch('/:id/assign-doctor', roleGuard('SUPER_ADMIN'), patientsController.assignDoctor);
export default router;
