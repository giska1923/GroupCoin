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
import { Expense, Group, GroupMember, Settlement, User } from '../models';
import { BadRequestError, ForbiddenError, NotFoundError } from '../types';
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

// Every group gets an image: when none is supplied at creation we assign a
// generated abstract avatar (purple palette to match the app theme). The seed
// is random so each group gets its own artwork.
const defaultGroupImageUrl = (): string => {
  const seed = crypto.randomUUID();
  const params = new URLSearchParams({
    seed,
    size: '256',
    backgroundColor: '1e1b4b,312e81,4338ca',
    shape1Color: '6366f1,818cf8',
    shape2Color: 'a5b4fc,8a89ff',
    shape3Color: '4f46e5,c7d2fe',
  });
  return `https://api.dicebear.com/9.x/shapes/png?${params.toString()}`;
};

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
          imageUrl: dto.imageUrl ?? defaultGroupImageUrl(),
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

    // Member counts for the fetched groups in one aggregate query.
    const counts = (await GroupMember.findAll({
      where: { groupId: groupIds },
      attributes: [
        'groupId',
        [sequelize.fn('COUNT', sequelize.col('id')), 'memberCount'],
      ],
      group: ['group_id'],
      raw: true,
    })) as unknown as { groupId: string; memberCount: string }[];
    const countByGroupId = new Map(
      counts.map(c => [c.groupId, Number(c.memberCount)]),
    );

    return groups.map(group => {
      const dto = toGroupDTO(group);
      dto.memberCount = countByGroupId.get(group.id) ?? 0;
      return dto;
    });
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
        imageUrl: string;
      }> = {};
      if (dto.name !== undefined) updates.name = dto.name;
      if (dto.description !== undefined) updates.description = dto.description;
      if (
        dto.defaultCurrency !== undefined &&
        dto.defaultCurrency !== group.defaultCurrency
      ) {
        // The group currency is the single currency for all of its expenses
        // and settlements, so it is locked once any money has been recorded.
        const [expenseCount, settlementCount] = await Promise.all([
          Expense.count({ where: { groupId }, transaction }),
          Settlement.count({ where: { groupId }, transaction }),
        ]);
        if (expenseCount > 0 || settlementCount > 0) {
          throw new BadRequestError(
            'The group currency cannot be changed after expenses or settlements have been recorded',
          );
        }
        updates.defaultCurrency = dto.defaultCurrency;
      }
      if (dto.imageUrl !== undefined) updates.imageUrl = dto.imageUrl;

      await group.update(updates, { transaction });

      // Don't persist image payloads (potentially large data URIs) in the
      // activity log — just note that the image changed.
      const loggedChanges = {
        ...updates,
        ...(updates.imageUrl !== undefined ? { imageUrl: '[updated]' } : {}),
      };

      await ActivityService.record({
        type: ActivityType.GROUP_UPDATED,
        actorId,
        groupId: group.id,
        entityType: 'group',
        entityId: group.id,
        metadata: { changes: loggedChanges },
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

      if (actorId === targetUserId) {
        await assertMember(groupId, actorId, transaction);
      } else {
        await assertAdminOrOwner(group, actorId, transaction);
      }

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
