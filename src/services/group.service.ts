import { Transaction } from 'sequelize';
import { ActivityType, GroupRole } from '../constants';
import sequelize from '../config/db.config';
import {
  AddGroupMemberDTO,
  CreateGroupDTO,
  UpdateGroupDTO,
} from '../dtos/request';
import {
  GroupDetailDTO,
  GroupDTO,
  GroupMemberDTO,
  UserDTO,
} from '../dtos/response';
import { Group, GroupMember, User } from '../models';
import {
  ConflictError,
  ForbiddenError,
  GroupRoleType,
  NotFoundError,
} from '../types';
import { mapToClass } from '../utils/validation/class-mapper';
import ActivityService from './activity.service';

// ---------- Internal helpers ----------

const loadGroupOr404 = async (
  groupId: string,
  transaction?: Transaction,
): Promise<Group> => {
  const group = await Group.findByPk(groupId, { transaction });
  if (!group) {
    throw new NotFoundError('Group not found');
  }
  return group;
};

const loadMembership = async (
  groupId: string,
  userId: string,
  transaction?: Transaction,
): Promise<GroupMember | null> => {
  return GroupMember.findOne({
    where: { groupId, userId },
    transaction,
  });
};

const assertMember = async (
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

const assertAdminOrOwner = async (
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

const assertOwner = (group: Group, userId: string): void => {
  if (group.ownerId !== userId) {
    throw new ForbiddenError('Only the group owner can perform this action');
  }
};

const toGroupDTO = (group: Group): GroupDTO => mapToClass(group, GroupDTO);

const toMemberDTO = (
  member: GroupMember,
  user?: User | null,
): GroupMemberDTO => {
  const dto = mapToClass(member, GroupMemberDTO);
  if (user) {
    dto.user = mapToClass(user, UserDTO);
  }
  return dto;
};

// ---------- Service ----------

const GroupService = {
  async createGroup(
    actorId: string,
    dto: CreateGroupDTO,
  ): Promise<GroupDetailDTO> {
    return sequelize.transaction(async transaction => {
      const group = await Group.create(
        {
          name: dto.name,
          description: dto.description ?? null,
          defaultCurrency: dto.defaultCurrency ?? 'USD',
          ownerId: actorId,
        },
        { transaction },
      );

      const membership = await GroupMember.create(
        {
          groupId: group.id,
          userId: actorId,
          role: GroupRole.ADMIN,
        },
        { transaction },
      );

      await ActivityService.record({
        type: ActivityType.GROUP_CREATED,
        actorId,
        groupId: group.id,
        entityType: 'group',
        entityId: group.id,
        metadata: { name: group.name },
        transaction,
      });

      const owner = await User.findByPk(actorId, { transaction });

      return mapToClass(
        {
          group: toGroupDTO(group),
          members: [toMemberDTO(membership, owner)],
        },
        GroupDetailDTO,
      );
    });
  },

  async listGroupsForUser(userId: string): Promise<GroupDTO[]> {
    // Two-query approach (avoids `include` alias quirks): fetch membership rows
    // for the caller, then load the corresponding groups in one IN query.
    const memberships = await GroupMember.findAll({
      where: { userId },
      attributes: ['groupId'],
    });
    if (memberships.length === 0) return [];

    const groupIds = memberships.map(m => m.groupId);
    const groups = await Group.findAll({
      where: { id: groupIds },
      order: [['created_at', 'DESC']],
    });
    return groups.map(toGroupDTO);
  },

  async getGroupDetail(
    actorId: string,
    groupId: string,
  ): Promise<GroupDetailDTO> {
    const group = await loadGroupOr404(groupId);
    await assertMember(groupId, actorId);

    const members = await GroupMember.findAll({
      where: { groupId },
      order: [['created_at', 'ASC']],
    });
    const users = await User.findAll({
      where: { id: members.map(m => m.userId) },
    });
    const userById = new Map(users.map(u => [u.id, u]));

    return mapToClass(
      {
        group: toGroupDTO(group),
        members: members.map(m => toMemberDTO(m, userById.get(m.userId))),
      },
      GroupDetailDTO,
    );
  },

  async updateGroup(
    actorId: string,
    groupId: string,
    dto: UpdateGroupDTO,
  ): Promise<GroupDTO> {
    return sequelize.transaction(async transaction => {
      const group = await loadGroupOr404(groupId, transaction);
      await assertAdminOrOwner(group, actorId, transaction);

      const updates: Partial<{
        name: string;
        description: string | null;
        defaultCurrency: string;
      }> = {};
      if (dto.name !== undefined) updates.name = dto.name;
      if (dto.description !== undefined) updates.description = dto.description;
      if (dto.defaultCurrency !== undefined) {
        updates.defaultCurrency = dto.defaultCurrency;
      }

      await group.update(updates, { transaction });

      await ActivityService.record({
        type: ActivityType.GROUP_UPDATED,
        actorId,
        groupId: group.id,
        entityType: 'group',
        entityId: group.id,
        metadata: { changes: updates },
        transaction,
      });

      return toGroupDTO(group);
    });
  },

  async deleteGroup(actorId: string, groupId: string): Promise<void> {
    await sequelize.transaction(async transaction => {
      const group = await loadGroupOr404(groupId, transaction);
      assertOwner(group, actorId);

      // Snapshot the group name before deletion so the activity log stays
      // meaningful after the row is gone.
      const snapshot = { name: group.name };

      await group.destroy({ transaction });

      await ActivityService.record({
        type: ActivityType.GROUP_DELETED,
        actorId,
        groupId: null,
        entityType: 'group',
        entityId: groupId,
        metadata: snapshot,
        transaction,
      });
    });
  },

  async listMembers(
    actorId: string,
    groupId: string,
  ): Promise<GroupMemberDTO[]> {
    await loadGroupOr404(groupId);
    await assertMember(groupId, actorId);

    const members = await GroupMember.findAll({
      where: { groupId },
      order: [['created_at', 'ASC']],
    });
    const users = await User.findAll({
      where: { id: members.map(m => m.userId) },
    });
    const userById = new Map(users.map(u => [u.id, u]));
    return members.map(m => toMemberDTO(m, userById.get(m.userId)));
  },

  async addMember(
    actorId: string,
    groupId: string,
    dto: AddGroupMemberDTO,
  ): Promise<GroupMemberDTO> {
    return sequelize.transaction(async transaction => {
      const group = await loadGroupOr404(groupId, transaction);
      await assertAdminOrOwner(group, actorId, transaction);

      const targetUser = await User.findOne({
        where: { email: dto.email.toLowerCase() },
        transaction,
      });
      if (!targetUser) {
        throw new NotFoundError(`No user found with email ${dto.email}`);
      }

      const existing = await loadMembership(
        groupId,
        targetUser.id,
        transaction,
      );
      if (existing) {
        throw new ConflictError('User is already a member of this group');
      }

      const role: GroupRoleType = dto.role ?? GroupRole.MEMBER;
      const membership = await GroupMember.create(
        {
          groupId,
          userId: targetUser.id,
          role,
        },
        { transaction },
      );

      await ActivityService.record({
        type: ActivityType.MEMBER_ADDED,
        actorId,
        groupId,
        entityType: 'group_member',
        entityId: membership.id,
        metadata: {
          userId: targetUser.id,
          email: targetUser.email,
          name: targetUser.name,
          role,
        },
        transaction,
      });

      return toMemberDTO(membership, targetUser);
    });
  },

  async removeMember(
    actorId: string,
    groupId: string,
    targetUserId: string,
  ): Promise<void> {
    await sequelize.transaction(async transaction => {
      const group = await loadGroupOr404(groupId, transaction);
      await assertAdminOrOwner(group, actorId, transaction);

      if (group.ownerId === targetUserId) {
        throw new ForbiddenError(
          'The group owner cannot be removed. Transfer ownership first.',
        );
      }

      const membership = await loadMembership(
        groupId,
        targetUserId,
        transaction,
      );
      if (!membership) {
        throw new NotFoundError('Member not found in this group');
      }

      // Snapshot for the activity log before destroying the row.
      const targetUser = await User.findByPk(targetUserId, { transaction });

      await membership.destroy({ transaction });

      await ActivityService.record({
        type: ActivityType.MEMBER_REMOVED,
        actorId,
        groupId,
        entityType: 'group_member',
        entityId: membership.id,
        metadata: {
          userId: targetUserId,
          email: targetUser?.email,
          name: targetUser?.name,
        },
        transaction,
      });
    });
  },
};

export default GroupService;
