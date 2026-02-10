import { Router } from 'express';
import { authMiddleware, roleGuard } from '../middleware/auth';
import * as usersController from '../controllers/usersController';

const router = Router();
router.use(authMiddleware);
router.use(roleGuard('SUPER_ADMIN'));
router.post('/', usersController.createUser);
router.get('/', usersController.listUsers);
router.patch('/:id', usersController.updateUser);
export default router;
