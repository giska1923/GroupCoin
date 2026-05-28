import { Transaction } from 'sequelize';
import { GroupRole } from '../constants';
import { Group, GroupMember } from '../models';
import { ForbiddenError, NotFoundError } from '../types';

/**
 * Reusable group-scoped authorization helpers.
 *
 * Each helper accepts an optional `transaction` so it can be used inside a
 * larger atomic operation.
 */

export const loadGroupOr404 = async (
  groupId: string,
  transaction?: Transaction,
): Promise<Group> => {
  const group = await Group.findByPk(groupId, { transaction });
  if (!group) {
    throw new NotFoundError('Group not found');
  }
  return group;
};

export const loadMembership = (
  groupId: string,
  userId: string,
  transaction?: Transaction,
): Promise<GroupMember | null> => {
  return GroupMember.findOne({
    where: { groupId, userId },
    transaction,
  });
};

export const assertMember = async (
  groupId: string,
  userId: string,
  transaction?: Transaction,
): Promise<GroupMember> => {
  const membership = await loadMembership(groupId, userId, transaction);
  if (!membership) {
    throw new ForbiddenError('You are not a member of this group');
  }
  return membership;
};

export const assertAdminOrOwner = async (
  group: Group,
  userId: string,
  transaction?: Transaction,
): Promise<void> => {
  if (group.ownerId === userId) return;
  const membership = await loadMembership(group.id, userId, transaction);
  if (!membership || membership.role !== GroupRole.ADMIN) {
    throw new ForbiddenError(
      'Only the group owner or an admin can perform this action',
    );
  }
};

export const assertOwner = (group: Group, userId: string): void => {
  if (group.ownerId !== userId) {
    throw new ForbiddenError('Only the group owner can perform this action');
  }
};
