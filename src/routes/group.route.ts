import { Router } from 'express';
import GroupController from '../controllers/group.controller';
import {
  AddGroupMemberDTO,
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

export default router;
