import { Router } from 'express';
import { authMiddleware, roleGuard } from '../middleware/auth';
import * as patientsController from '../controllers/patientsController';
import * as patientDetailsController from '../controllers/patientDetailsController';
import * as visitRecordsController from '../controllers/visitRecordsController';
import * as prescriptionsController from '../controllers/prescriptionsController';
import * as attachmentsController from '../controllers/attachmentsController';

const router = Router();
router.use(authMiddleware);
router.post('/', roleGuard('RECEPTIONIST'), patientsController.createPatient);
router.get('/', patientsController.listPatients);
router.get('/stats', patientsController.patientStats);
// Patient details module (must be before /:id)
router.get('/:id/details', patientDetailsController.getPatientDetails);
router.get('/:id/visit-records', visitRecordsController.listVisitRecords);
router.post('/:id/visit-records', visitRecordsController.createVisitRecord);
router.get('/:id/prescriptions', prescriptionsController.listPrescriptions);
router.post('/:id/prescriptions', prescriptionsController.createPrescription);
router.get('/:id/attachments', attachmentsController.listAttachments);
router.post('/:id/attachments', attachmentsController.createAttachment);
router.get('/:id', patientsController.getPatient);
router.patch('/:id', roleGuard('RECEPTIONIST', 'SUPER_ADMIN'), patientsController.updatePatient);
router.delete('/:id', roleGuard('RECEPTIONIST', 'SUPER_ADMIN'), patientsController.deletePatient);
router.patch('/:id/assign-doctor', roleGuard('SUPER_ADMIN'), patientsController.assignDoctor);
export default router;
