import { Router } from 'express';
import AuthController from '../controllers/auth.controller';
import {
  GoogleLoginDTO,
  LoginDTO,
  RefreshTokenDTO,
  RegisterDTO,
} from '../dtos/request';
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

router.post(
  '/google',
  validateDTO(GoogleLoginDTO),
  asyncWrapper(AuthController.google),
);

router.post(
  '/refresh',
  validateDTO(RefreshTokenDTO),
  asyncWrapper(AuthController.refresh),
);

router.post(
  '/logout',
  validateDTO(RefreshTokenDTO),
  asyncWrapper(AuthController.logout),
);

router.get('/me', requireAuth, asyncWrapper(AuthController.me));

router.delete('/me', requireAuth, asyncWrapper(AuthController.deleteAccount));

export default router;
