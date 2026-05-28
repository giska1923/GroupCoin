import { Router } from 'express';
import ExpenseController from '../controllers/expense.controller';
import { UpdateExpenseDTO } from '../dtos/request';
import { requireAuth } from '../middlewares/auth.middleware';
import asyncWrapper from '../utils/async-wrapper';
import { validateDTO } from '../utils/validation/validate';

// Routes for working with a known expense by ID.
// Group-scoped routes (POST/list/balances) live in `group.route.ts` because
// they're naturally nested under `/groups/:groupId`.
const router = Router();

router.use(requireAuth);

router.get('/:id', asyncWrapper(ExpenseController.getExpense));
router.put(
  '/:id',
  validateDTO(UpdateExpenseDTO),
  asyncWrapper(ExpenseController.updateExpense),
);
router.delete('/:id', asyncWrapper(ExpenseController.deleteExpense));

export default router;
