import { Router } from 'express';
import ExpenseController from '../controllers/expense.controller';
import GroupController from '../controllers/group.controller';
import {
  AddGroupMemberDTO,
  CreateExpenseDTO,
  CreateGroupDTO,
  UpdateGroupDTO,
} from '../dtos/request';
import { requireAuth } from '../middlewares/auth.middleware';
import asyncWrapper from '../utils/async-wrapper';
import { validateDTO } from '../utils/validation/validate';

const router = Router();

router.use(requireAuth);

// Groups
router.post(
  '/',
  validateDTO(CreateGroupDTO),
  asyncWrapper(GroupController.createGroup),
);
router.get('/', asyncWrapper(GroupController.listGroups));
router.get('/:id', asyncWrapper(GroupController.getGroup));
router.put(
  '/:id',
  validateDTO(UpdateGroupDTO),
  asyncWrapper(GroupController.updateGroup),
);
router.delete('/:id', asyncWrapper(GroupController.deleteGroup));

// Members
router.get('/:id/members', asyncWrapper(GroupController.listMembers));
router.post(
  '/:id/members',
  validateDTO(AddGroupMemberDTO),
  asyncWrapper(GroupController.addMember),
);
router.delete(
  '/:id/members/:userId',
  asyncWrapper(GroupController.removeMember),
);

// Expenses (nested under group)
router.post(
  '/:id/expenses',
  validateDTO(CreateExpenseDTO),
  asyncWrapper(ExpenseController.createExpense),
);
router.get('/:id/expenses', asyncWrapper(ExpenseController.listGroupExpenses));

// Balances
router.get('/:id/balances', asyncWrapper(ExpenseController.getGroupBalances));
router.get(
  '/:id/balances/simplified',
  asyncWrapper(ExpenseController.getSimplifiedTransfers),
);

export default router;
