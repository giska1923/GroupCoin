import { Router } from 'express';
import SettlementController from '../controllers/settlement.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import asyncWrapper from '../utils/async-wrapper';

// Routes for working with a known settlement by ID.
// Group-scoped routes (POST/list) live in `group.route.ts` since they're
// naturally nested under `/groups/:id`.
const router = Router();

router.use(requireAuth);

router.get('/:id', asyncWrapper(SettlementController.getSettlement));
router.delete('/:id', asyncWrapper(SettlementController.deleteSettlement));

export default router;
