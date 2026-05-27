import { Router } from 'express';
import asyncWrapper from '../utils/async-wrapper';
import UserController from '../controllers/user.controller';
import { validateDTO } from '../utils/validation/validate';
import { UpdateUserDTO } from '../dtos/request';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', asyncWrapper(UserController.getAllUsers));
router.get('/:id', asyncWrapper(UserController.getUserById));

router.put(
  '/:id',
  validateDTO(UpdateUserDTO),
  asyncWrapper(UserController.updateUser),
);

export default router;
