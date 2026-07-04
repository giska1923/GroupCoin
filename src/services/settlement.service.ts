import { Op, Transaction } from 'sequelize';
import { ActivityType, GroupRole } from '../constants';
import sequelize from '../config/db.config';
import { CreateSettlementDTO } from '../dtos/request';
import { SettlementDTO } from '../dtos/response';
import { Expense, Group, GroupMember, Settlement } from '../models';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../types';
import { toCents } from '../utils/money';
import { mapToClass } from '../utils/validation/class-mapper';
import { notifyGroupUpdated } from '../websockets/group-notifier';
import ActivityService from './activity.service';
import { refreshGroupSettlementStatus } from './balance.service';
import { assertMember, loadGroupOr404 } from './group-access.service';

const toSettlementDTO = (s: Settlement): SettlementDTO =>
  mapToClass(s, SettlementDTO);

const loadSettlementOr404 = async (
  id: string,
  transaction?: Transaction,
): Promise<Settlement> => {
  const settlement = await Settlement.findByPk(id, { transaction });
  if (!settlement) {
    throw new NotFoundError('Settlement not found');
  }
  return settlement;
};

/**
 * Delete policy: the from-user, the to-user, or a group admin/owner can
 * delete a settlement. This matches the create policy where any group member
 * can record a payment, but only people with a stake can undo it.
 */
const assertCanDeleteSettlement = async (
  settlement: Settlement,
  group: Group,
  actorId: string,
  transaction?: Transaction,
): Promise<void> => {
  if (
    actorId === settlement.fromUserId ||
    actorId === settlement.toUserId ||
    actorId === group.ownerId
  ) {
    return;
  }

  const membership = await GroupMember.findOne({
    where: { groupId: group.id, userId: actorId },
    transaction,
  });
  if (membership && membership.role === GroupRole.ADMIN) return;

  throw new ForbiddenError(
    'Only a participant of the settlement or a group admin can delete it',
  );
};

const SettlementService = {
  async createSettlement(
    actorId: string,
    groupId: string,
    dto: CreateSettlementDTO,
  ): Promise<SettlementDTO> {
    return sequelize.transaction(async transaction => {
      const group = await loadGroupOr404(groupId, transaction);
      await assertMember(groupId, actorId, transaction);

      const fromUserId = dto.fromUserId ?? actorId;
      const toUserId = dto.toUserId;

      if (fromUserId === toUserId) {
        throw new BadRequestError(
          'Settlement payer and payee must be different users',
        );
      }

      // Both endpoints must currently be members of the group.
      const memberships = await GroupMember.findAll({
        where: { groupId, userId: [fromUserId, toUserId] },
        transaction,
      });
      const memberIds = new Set(memberships.map(m => m.userId));
      if (!memberIds.has(fromUserId)) {
        throw new BadRequestError(
          'fromUserId must be a member of the group',
        );
      }
      if (!memberIds.has(toUserId)) {
        throw new BadRequestError('toUserId must be a member of the group');
      }

      const totalCents = toCents(dto.amount);
      if (totalCents <= 0) {
        throw new BadRequestError('amount must be greater than zero');
      }

      // Groups are single-currency: settlements use the group's currency.
      if (dto.currency && dto.currency !== group.defaultCurrency) {
        throw new BadRequestError(
          `This group uses ${group.defaultCurrency}; settlements must be recorded in the group currency`,
        );
      }

      const settlement = await Settlement.create(
        {
          groupId,
          fromUserId,
          toUserId,
          amount: dto.amount,
          currency: dto.currency ?? group.defaultCurrency,
          settledAt: dto.settledAt ? new Date(dto.settledAt) : new Date(),
          note: dto.note ?? null,
        },
        { transaction },
      );

      await ActivityService.record({
        type: ActivityType.SETTLEMENT_CREATED,
        actorId,
        groupId,
        entityType: 'settlement',
        entityId: settlement.id,
        metadata: {
          fromUserId,
          toUserId,
          amount: settlement.amount,
          currency: settlement.currency,
        },
        transaction,
      });

      // Flips the group to SETTLED_UP when this payment zeroed every balance.
      await refreshGroupSettlementStatus(group, transaction);

      transaction.afterCommit(() => notifyGroupUpdated(groupId));

      return toSettlementDTO(settlement);
    });
  },

  async listGroupSettlements(
    actorId: string,
    groupId: string,
  ): Promise<SettlementDTO[]> {
    await loadGroupOr404(groupId);
    await assertMember(groupId, actorId);
    const settlements = await Settlement.findAll({
      where: { groupId },
      order: [
        ['settled_at', 'DESC'],
        ['created_at', 'DESC'],
      ],
    });
    return settlements.map(toSettlementDTO);
  },

  async getSettlement(
    actorId: string,
    settlementId: string,
  ): Promise<SettlementDTO> {
    const settlement = await loadSettlementOr404(settlementId);
    await assertMember(settlement.groupId, actorId);
    return toSettlementDTO(settlement);
  },

  async deleteSettlement(
    actorId: string,
    settlementId: string,
  ): Promise<void> {
    await sequelize.transaction(async transaction => {
      const settlement = await loadSettlementOr404(settlementId, transaction);
      const group = await loadGroupOr404(settlement.groupId, transaction);
      await assertCanDeleteSettlement(settlement, group, actorId, transaction);

      const snapshot = {
        fromUserId: settlement.fromUserId,
        toUserId: settlement.toUserId,
        amount: settlement.amount,
        currency: settlement.currency,
      };

      await settlement.destroy({ transaction });

      await ActivityService.record({
        type: ActivityType.SETTLEMENT_DELETED,
        actorId,
        groupId: settlement.groupId,
        entityType: 'settlement',
        entityId: settlement.id,
        metadata: snapshot,
        transaction,
      });

      // Any full settle-up stamped after this settlement existed necessarily
      // relied on it — deleting the payment re-opens those expenses.
      await Expense.update(
        { settledAt: null },
        {
          where: {
            groupId: settlement.groupId,
            settledAt: { [Op.gte]: settlement.createdAt },
          },
          transaction,
        },
      );

      // Undoing a payment usually re-opens debts — recompute the status.
      await refreshGroupSettlementStatus(group, transaction);

      transaction.afterCommit(() => notifyGroupUpdated(settlement.groupId));
    });
  },
};

export default SettlementService;
