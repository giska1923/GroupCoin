import { Router } from 'express';
import AuthController from '../controllers/auth.controller';
import { LoginDTO, RegisterDTO } from '../dtos/request';
import { requireAuth } from '../middlewares/auth.middleware';
import asyncWrapper from '../utils/async-wrapper';
import { validateDTO } from '../utils/validation/validate';

const router = Router();

router.post(
  '/register',
  validateDTO(RegisterDTO),
  asyncWrapper(AuthController.register),
);

router.post(
  '/login',
  validateDTO(LoginDTO),
  asyncWrapper(AuthController.login),
);

router.get('/me', requireAuth, asyncWrapper(AuthController.me));

router.delete('/me', requireAuth, asyncWrapper(AuthController.deleteAccount));

export default router;
