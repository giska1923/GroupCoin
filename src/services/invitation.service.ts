import { Op, Transaction } from 'sequelize';
import { ActivityType, GroupRole, InvitationStatus } from '../constants';
import sequelize from '../config/db.config';
import { CreateInvitationDTO } from '../dtos/request';
import {
  GroupDTO,
  GroupMemberDTO,
  InvitationDTO,
  UserDTO,
} from '../dtos/response';
import { Group, GroupInvitation, GroupMember, User } from '../models';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../types';
import { mapToClass } from '../utils/validation/class-mapper';
import ActivityService from './activity.service';
import {
  assertAdminOrOwner,
  loadGroupOr404,
  loadMembership,
} from './group-access.service';
import { notifyInvitationReceived } from '../websockets/invitation-notifier';

const INVITATION_TTL_DAYS = 7;

interface CreateInvitationOptions {
  transaction?: Transaction;
  notify?: boolean;
}

const invitationExpiry = (): Date => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITATION_TTL_DAYS);
  return expiresAt;
};

const toInvitationDTO = (
  invitation: GroupInvitation,
  group?: Group | null,
  inviter?: User | null,
): InvitationDTO => {
  const dto = mapToClass(invitation, InvitationDTO);
  if (group) {
    dto.group = mapToClass(group, GroupDTO);
  }
  if (inviter) {
    dto.inviter = mapToClass(inviter, UserDTO);
  }
  return dto;
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

const assertInvitationRecipient = (
  invitation: GroupInvitation,
  userId: string,
  userEmail: string,
): void => {
  const normalizedEmail = userEmail.toLowerCase();
  const isRecipient =
    invitation.inviteeUserId === userId ||
    invitation.inviteeEmail === normalizedEmail;

  if (!isRecipient) {
    throw new ForbiddenError('This invitation is not addressed to you');
  }
};

const loadPendingInvitationOr404 = async (
  invitationId: string,
  transaction?: Transaction,
): Promise<GroupInvitation> => {
  const invitation = await GroupInvitation.findByPk(invitationId, {
    transaction,
  });
  if (!invitation) {
    throw new NotFoundError('Invitation not found');
  }
  if (invitation.status !== InvitationStatus.PENDING) {
    throw new BadRequestError('This invitation has already been addressed');
  }
  if (invitation.expiresAt < new Date()) {
    throw new BadRequestError('This invitation has expired');
  }
  return invitation;
};

const InvitationService = {
  async createInvitation(
    actorId: string,
    groupId: string,
    dto: CreateInvitationDTO,
    options: CreateInvitationOptions = {},
  ): Promise<InvitationDTO> {
    const { transaction, notify = true } = options;
    const normalizedEmail = dto.email.toLowerCase();

    const run = async (t: Transaction): Promise<InvitationDTO> => {
      const group = await loadGroupOr404(groupId, t);
      await assertAdminOrOwner(group, actorId, t);

      const actor = await User.findByPk(actorId, { transaction: t });
      if (!actor) {
        throw new NotFoundError('User not found');
      }
      if (actor.email === normalizedEmail) {
        throw new BadRequestError('You cannot invite yourself');
      }

      const existingMember = await User.findOne({
        where: { email: normalizedEmail },
        transaction: t,
      });
      if (existingMember) {
        const membership = await loadMembership(
          groupId,
          existingMember.id,
          t,
        );
        if (membership) {
          throw new ConflictError('User is already a member of this group');
        }
      }

      const existingInvite = await GroupInvitation.findOne({
        where: {
          groupId,
          inviteeEmail: normalizedEmail,
          status: InvitationStatus.PENDING,
        },
        transaction: t,
      });
      if (existingInvite) {
        throw new ConflictError(
          'A pending invitation already exists for this email',
        );
      }

      const invitation = await GroupInvitation.create(
        {
          groupId,
          inviterId: actorId,
          inviteeEmail: normalizedEmail,
          inviteeUserId: existingMember?.id ?? null,
          role: dto.role ?? GroupRole.MEMBER,
          status: InvitationStatus.PENDING,
          expiresAt: invitationExpiry(),
        },
        { transaction: t },
      );

      await ActivityService.record({
        type: ActivityType.INVITATION_SENT,
        actorId,
        groupId,
        entityType: 'group_invitation',
        entityId: invitation.id,
        metadata: {
          inviteeEmail: normalizedEmail,
          role: invitation.role,
        },
        transaction: t,
      });

      const dtoResult = toInvitationDTO(invitation, group, actor);
      if (notify) {
        notifyInvitationReceived(dtoResult);
      }
      return dtoResult;
    };

    if (transaction) {
      return run(transaction);
    }
    return sequelize.transaction(run);
  },

  async createInvitations(
    actorId: string,
    groupId: string,
    emails: string[],
    options: CreateInvitationOptions = {},
  ): Promise<InvitationDTO[]> {
    if (emails.length === 0) return [];

    const uniqueEmails = Array.from(
      new Set(emails.map(email => email.toLowerCase())),
    );

    const run = async (transaction: Transaction): Promise<InvitationDTO[]> => {
      const invitations: InvitationDTO[] = [];
      for (const email of uniqueEmails) {
        const invitation = await this.createInvitation(
          actorId,
          groupId,
          { email },
          { transaction, notify: false },
        );
        invitations.push(invitation);
      }
      return invitations;
    };

    const invitations = options.transaction
      ? await run(options.transaction)
      : await sequelize.transaction(run);

    if (options.notify !== false) {
      invitations.forEach(notifyInvitationReceived);
    }

    return invitations;
  },

  async listPendingForUser(
    userId: string,
    userEmail: string,
  ): Promise<InvitationDTO[]> {
    const normalizedEmail = userEmail.toLowerCase();
    const invitations = await GroupInvitation.findAll({
      where: {
        status: InvitationStatus.PENDING,
        expiresAt: { [Op.gt]: new Date() },
        [Op.or]: [
          { inviteeUserId: userId },
          { inviteeEmail: normalizedEmail },
        ],
      },
      order: [['created_at', 'DESC']],
    });

    if (invitations.length === 0) return [];

    const groupIds = Array.from(new Set(invitations.map(i => i.groupId)));
    const inviterIds = Array.from(new Set(invitations.map(i => i.inviterId)));

    const [groups, inviters] = await Promise.all([
      Group.findAll({ where: { id: groupIds } }),
      User.findAll({ where: { id: inviterIds } }),
    ]);

    const groupById = new Map(groups.map(g => [g.id, g]));
    const inviterById = new Map(inviters.map(u => [u.id, u]));

    return invitations.map(inv =>
      toInvitationDTO(
        inv,
        groupById.get(inv.groupId),
        inviterById.get(inv.inviterId),
      ),
    );
  },

  async acceptInvitation(
    userId: string,
    userEmail: string,
    invitationId: string,
  ): Promise<GroupMemberDTO> {
    return sequelize.transaction(async transaction => {
      const invitation = await loadPendingInvitationOr404(
        invitationId,
        transaction,
      );
      assertInvitationRecipient(invitation, userId, userEmail);

      const existingMembership = await loadMembership(
        invitation.groupId,
        userId,
        transaction,
      );
      if (existingMembership) {
        throw new ConflictError('You are already a member of this group');
      }

      const user = await User.findByPk(userId, { transaction });
      if (!user) {
        throw new NotFoundError('User not found');
      }

      if (!invitation.inviteeUserId) {
        await invitation.update({ inviteeUserId: userId }, { transaction });
      }

      const membership = await GroupMember.create(
        {
          groupId: invitation.groupId,
          userId,
          role: invitation.role,
        },
        { transaction },
      );

      await invitation.update(
        { status: InvitationStatus.ACCEPTED },
        { transaction },
      );

      await ActivityService.record({
        type: ActivityType.INVITATION_ACCEPTED,
        actorId: userId,
        groupId: invitation.groupId,
        entityType: 'group_invitation',
        entityId: invitation.id,
        metadata: {
          userId,
          email: user.email,
          name: user.name,
          role: invitation.role,
        },
        transaction,
      });

      return toMemberDTO(membership, user);
    });
  },

  async declineInvitation(
    userId: string,
    userEmail: string,
    invitationId: string,
  ): Promise<void> {
    await sequelize.transaction(async transaction => {
      const invitation = await loadPendingInvitationOr404(
        invitationId,
        transaction,
      );
      assertInvitationRecipient(invitation, userId, userEmail);

      await invitation.update(
        { status: InvitationStatus.DECLINED },
        { transaction },
      );

      await ActivityService.record({
        type: ActivityType.INVITATION_DECLINED,
        actorId: userId,
        groupId: invitation.groupId,
        entityType: 'group_invitation',
        entityId: invitation.id,
        metadata: { inviteeEmail: invitation.inviteeEmail },
        transaction,
      });
    });
  },

  async revokeInvitation(
    actorId: string,
    groupId: string,
    invitationId: string,
  ): Promise<void> {
    await sequelize.transaction(async transaction => {
      const group = await loadGroupOr404(groupId, transaction);
      await assertAdminOrOwner(group, actorId, transaction);

      const invitation = await loadPendingInvitationOr404(
        invitationId,
        transaction,
      );
      if (invitation.groupId !== groupId) {
        throw new NotFoundError('Invitation not found in this group');
      }

      await invitation.update(
        { status: InvitationStatus.REVOKED },
        { transaction },
      );

      await ActivityService.record({
        type: ActivityType.INVITATION_REVOKED,
        actorId,
        groupId,
        entityType: 'group_invitation',
        entityId: invitation.id,
        metadata: { inviteeEmail: invitation.inviteeEmail },
        transaction,
      });
    });
  },

  async listGroupInvitations(
    actorId: string,
    groupId: string,
  ): Promise<InvitationDTO[]> {
    const group = await loadGroupOr404(groupId);
    await assertAdminOrOwner(group, actorId);

    const invitations = await GroupInvitation.findAll({
      where: {
        groupId,
        status: InvitationStatus.PENDING,
        expiresAt: { [Op.gt]: new Date() },
      },
      order: [['created_at', 'DESC']],
    });

    const inviterIds = Array.from(new Set(invitations.map(i => i.inviterId)));
    const inviters = inviterIds.length
      ? await User.findAll({ where: { id: inviterIds } })
      : [];
    const inviterById = new Map(inviters.map(u => [u.id, u]));

    return invitations.map(inv =>
      toInvitationDTO(inv, group, inviterById.get(inv.inviterId)),
    );
  },
};

export default InvitationService;
