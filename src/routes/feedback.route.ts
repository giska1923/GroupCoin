import { Router } from 'express';
import FeedbackController from '../controllers/feedback.controller';
import { CreateFeedbackDTO } from '../dtos/request';
import { requireAuth } from '../middlewares/auth.middleware';
import asyncWrapper from '../utils/async-wrapper';
import { validateDTO } from '../utils/validation/validate';

const router = Router();

router.use(requireAuth);

router.post(
  '/',
  validateDTO(CreateFeedbackDTO),
  asyncWrapper(FeedbackController.submit),
);

export default router;
