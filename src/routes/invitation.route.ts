import { Router } from 'express';
import InvitationController from '../controllers/invitation.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import asyncWrapper from '../utils/async-wrapper';

const router = Router();

router.use(requireAuth);

router.get('/', asyncWrapper(InvitationController.listPending));
router.post('/:id/accept', asyncWrapper(InvitationController.accept));
router.post('/:id/decline', asyncWrapper(InvitationController.decline));

export default router;
