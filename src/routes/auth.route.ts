import { Router } from 'express';
import AuthController from '../controllers/auth.controller';
import {
  GoogleLoginDTO,
  LoginDTO,
  RefreshTokenDTO,
  RegisterDTO,
  RegisterDeviceTokenDTO,
  RemoveDeviceTokenDTO,
  ResendVerificationDTO,
  VerifyEmailDTO,
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
  '/verify-email',
  validateDTO(VerifyEmailDTO),
  asyncWrapper(AuthController.verifyEmail),
);

router.post(
  '/resend-verification',
  validateDTO(ResendVerificationDTO),
  asyncWrapper(AuthController.resendVerification),
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

router.post(
  '/device-tokens',
  requireAuth,
  validateDTO(RegisterDeviceTokenDTO),
  asyncWrapper(AuthController.registerDeviceToken),
);

router.delete(
  '/device-tokens',
  requireAuth,
  validateDTO(RemoveDeviceTokenDTO),
  asyncWrapper(AuthController.removeDeviceToken),
);

export default router;
