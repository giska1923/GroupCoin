import { Router } from 'express';
import asyncWrapper from '../utils/async-wrapper';
import UserController from '../controllers/user.controller';
import { validateDTO } from '../utils/validation/validate';
import { CreateUserDTO, UpdateUserDTO } from '../dtos/request';

const router = Router();

router.get('/', asyncWrapper(UserController.getAllUsers));
router.get('/:id', asyncWrapper(UserController.getUserById));

router.post(
  '/',
  validateDTO(CreateUserDTO),
  asyncWrapper(UserController.createUser),
);

router.put(
  '/:id',
  validateDTO(UpdateUserDTO),
  asyncWrapper(UserController.updateUser),
);

export default router;
