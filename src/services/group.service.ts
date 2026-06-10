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
  InvitationDTO,
  UserDTO,
} from '../dtos/response';
import { Group, GroupMember, User } from '../models';
import { ForbiddenError, NotFoundError } from '../types';
import { mapToClass } from '../utils/validation/class-mapper';
import ActivityService from './activity.service';
import InvitationService from './invitation.service';
import { notifyInvitationReceived } from '../websockets/invitation-notifier';
import {
  assertAdminOrOwner,
  assertMember,
  assertOwner,
  loadGroupOr404,
  loadMembership,
} from './group-access.service';

// ---------- Internal helpers ----------

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
    let invitationsToNotify: InvitationDTO[] = [];

    const detail = await sequelize.transaction(async transaction => {
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

      const detail = mapToClass(
        {
          group: toGroupDTO(group),
          members: [toMemberDTO(membership, owner)],
        },
        GroupDetailDTO,
      );

      const inviteEmails = dto.inviteEmails ?? [];
      if (inviteEmails.length > 0) {
        invitationsToNotify = await InvitationService.createInvitations(
          actorId,
          group.id,
          inviteEmails,
          { transaction, notify: false },
        );
      }

      return detail;
    });

    invitationsToNotify.forEach(notifyInvitationReceived);

    return detail;
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
  ): Promise<InvitationDTO> {
    return InvitationService.createInvitation(actorId, groupId, {
      email: dto.email,
      role: dto.role,
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
