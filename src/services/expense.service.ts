import { Transaction } from 'sequelize';
import { ActivityType, SplitType } from '../constants';
import sequelize from '../config/db.config';
import { CreateExpenseDTO, UpdateExpenseDTO } from '../dtos/request';
import {
  ExpenseDetailDTO,
  ExpenseDTO,
  ExpenseSplitDTO,
} from '../dtos/response';
import { Expense, ExpenseSplit, Group, GroupMember } from '../models';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  SplitTypeValue,
} from '../types';
import { fromCents, splitEqually, toCents } from '../utils/money';
import { mapToClass } from '../utils/validation/class-mapper';
import { notifyGroupUpdated } from '../websockets/group-notifier';
import ActivityService from './activity.service';
import PushService from './push.service';
import { refreshGroupSettlementStatus } from './balance.service';
import { assertMember, loadGroupOr404 } from './group-access.service';

// ---------- Helpers ----------

const toExpenseDTO = (expense: Expense): ExpenseDTO =>
  mapToClass(expense, ExpenseDTO);

const toSplitDTO = (split: ExpenseSplit): ExpenseSplitDTO =>
  mapToClass(split, ExpenseSplitDTO);

const toExpenseDetailDTO = (
  expense: Expense,
  splits: ExpenseSplit[],
): ExpenseDetailDTO =>
  mapToClass(
    {
      expense: toExpenseDTO(expense),
      splits: splits.map(toSplitDTO),
    },
    ExpenseDetailDTO,
  );

const loadExpenseOr404 = async (
  id: string,
  transaction?: Transaction,
): Promise<Expense> => {
  const expense = await Expense.findByPk(id, { transaction });
  if (!expense) {
    throw new NotFoundError('Expense not found');
  }
  return expense;
};

/**
 * Returns the set of user IDs that are currently members of the group.
 * Used to validate that `paidBy` and every `participantId` belong to the
 * group at the moment the expense is created/updated.
 */
const loadGroupMemberIds = async (
  groupId: string,
  transaction?: Transaction,
): Promise<Set<string>> => {
  const members = await GroupMember.findAll({
    where: { groupId },
    attributes: ['userId'],
    transaction,
  });
  return new Set(members.map(m => m.userId));
};

/**
 * Given the total amount (in cents) and a list of participant user IDs,
 * produce the per-user owed amounts. For EQUAL splits we use the cents-aware
 * `splitEqually` helper so the sum always equals the original total.
 *
 * Other split types are accepted at the schema level but not yet implemented
 * — callers requesting them will receive a 400.
 */
const computeSplitAmounts = (
  splitType: SplitTypeValue,
  totalCents: number,
  participantIds: string[],
): { userId: string; owedCents: number }[] => {
  if (splitType !== SplitType.EQUAL) {
    throw new BadRequestError(
      `Split type "${splitType}" is not yet supported. Use "EQUAL".`,
    );
  }
  const shares = splitEqually(totalCents, participantIds.length);
  return participantIds.map((userId, idx) => ({
    userId,
    owedCents: shares[idx],
  }));
};

/**
 * Update access policy: only the original payer or a group admin/owner can
 * mutate or delete an expense.
 */
const assertCanMutateExpense = async (
  expense: Expense,
  group: Group,
  actorId: string,
  transaction?: Transaction,
): Promise<void> => {
  if (expense.paidBy === actorId) return;
  if (group.ownerId === actorId) return;

  const membership = await GroupMember.findOne({
    where: { groupId: group.id, userId: actorId },
    transaction,
  });
  if (membership && membership.role === 'ADMIN') return;

  throw new ForbiddenError(
    'Only the payer or a group admin can modify this expense',
  );
};

// ---------- Service ----------

const ExpenseService = {
  async createExpense(
    actorId: string,
    groupId: string,
    dto: CreateExpenseDTO,
  ): Promise<ExpenseDetailDTO> {
    return sequelize.transaction(async transaction => {
      const group = await loadGroupOr404(groupId, transaction);
      await assertMember(groupId, actorId, transaction);

      const memberIds = await loadGroupMemberIds(groupId, transaction);

      const paidBy = dto.paidBy ?? actorId;
      if (!memberIds.has(paidBy)) {
        throw new BadRequestError('paidBy must be a member of the group');
      }

      // Default participant set is "everyone in the group".
      const participantIds = dto.participantIds ?? Array.from(memberIds);
      if (participantIds.length === 0) {
        throw new BadRequestError(
          'Cannot create an expense with no participants',
        );
      }
      for (const id of participantIds) {
        if (!memberIds.has(id)) {
          throw new BadRequestError(
            `Participant ${id} is not a member of the group`,
          );
        }
      }

      const totalCents = toCents(dto.amount);
      if (totalCents <= 0) {
        throw new BadRequestError('amount must be greater than zero');
      }

      // Groups are single-currency: every expense uses the group's currency.
      if (dto.currency && dto.currency !== group.defaultCurrency) {
        throw new BadRequestError(
          `This group uses ${group.defaultCurrency}; expenses must be entered in the group currency`,
        );
      }

      const splitType: SplitTypeValue = dto.splitType ?? SplitType.EQUAL;
      const shares = computeSplitAmounts(splitType, totalCents, participantIds);

      const expense = await Expense.create(
        {
          groupId,
          paidBy,
          amount: fromCents(totalCents),
          description: dto.description,
          currency: dto.currency ?? group.defaultCurrency,
          expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : new Date(),
          splitType,
        },
        { transaction },
      );

      const splits = await ExpenseSplit.bulkCreate(
        shares.map(s => ({
          expenseId: expense.id,
          userId: s.userId,
          owedAmount: fromCents(s.owedCents),
        })),
        { transaction },
      );

      await ActivityService.record({
        type: ActivityType.EXPENSE_CREATED,
        actorId,
        groupId,
        entityType: 'expense',
        entityId: expense.id,
        metadata: {
          description: expense.description,
          amount: expense.amount,
          currency: expense.currency,
          paidBy,
          participantIds,
        },
        transaction,
      });

      // A new expense re-opens debts in a settled group.
      await refreshGroupSettlementStatus(group, transaction);

      // Notify every participant except the person who added the expense,
      // once the transaction has committed.
      const recipientIds = participantIds.filter(id => id !== actorId);
      transaction.afterCommit(() => {
        notifyGroupUpdated(groupId);
        void PushService.notifyUsers(recipientIds, {
          title: group.name,
          body: `New expense: ${expense.description} (${expense.currency} ${expense.amount})`,
          data: {
            type: 'EXPENSE_CREATED',
            groupId,
            expenseId: expense.id,
          },
        });
      });

      return toExpenseDetailDTO(expense, splits);
    });
  },

  async listGroupExpenses(
    actorId: string,
    groupId: string,
  ): Promise<ExpenseDTO[]> {
    await loadGroupOr404(groupId);
    await assertMember(groupId, actorId);
    const expenses = await Expense.findAll({
      where: { groupId },
      order: [
        ['expense_date', 'DESC'],
        ['created_at', 'DESC'],
      ],
    });
    return expenses.map(toExpenseDTO);
  },

  async getExpense(
    actorId: string,
    expenseId: string,
  ): Promise<ExpenseDetailDTO> {
    const expense = await loadExpenseOr404(expenseId);
    await assertMember(expense.groupId, actorId);
    const splits = await ExpenseSplit.findAll({
      where: { expenseId: expense.id },
    });
    return toExpenseDetailDTO(expense, splits);
  },

  async updateExpense(
    actorId: string,
    expenseId: string,
    dto: UpdateExpenseDTO,
  ): Promise<ExpenseDetailDTO> {
    return sequelize.transaction(async transaction => {
      const expense = await loadExpenseOr404(expenseId, transaction);
      const group = await loadGroupOr404(expense.groupId, transaction);
      await assertCanMutateExpense(expense, group, actorId, transaction);

      // Apply scalar updates first (these never affect splits).
      const scalarUpdates: Partial<{
        description: string;
        currency: string;
        expenseDate: Date;
      }> = {};
      if (dto.description !== undefined) scalarUpdates.description = dto.description;
      if (dto.currency !== undefined) {
        // Groups are single-currency: expenses cannot move off the group currency.
        if (dto.currency !== group.defaultCurrency) {
          throw new BadRequestError(
            `This group uses ${group.defaultCurrency}; expenses must be entered in the group currency`,
          );
        }
        scalarUpdates.currency = dto.currency;
      }
      if (dto.expenseDate !== undefined) {
        scalarUpdates.expenseDate = new Date(dto.expenseDate);
      }

      // Determine whether splits need to be rebuilt.
      const splitAffecting =
        dto.amount !== undefined ||
        dto.paidBy !== undefined ||
        dto.splitType !== undefined ||
        dto.participantIds !== undefined;

      let splits: ExpenseSplit[];

      if (splitAffecting) {
        const memberIds = await loadGroupMemberIds(group.id, transaction);

        const newPaidBy = dto.paidBy ?? expense.paidBy;
        if (!memberIds.has(newPaidBy)) {
          throw new BadRequestError('paidBy must be a member of the group');
        }

        const existingSplits = await ExpenseSplit.findAll({
          where: { expenseId: expense.id },
          transaction,
        });
        const newParticipantIds =
          dto.participantIds ?? existingSplits.map(s => s.userId);
        if (newParticipantIds.length === 0) {
          throw new BadRequestError(
            'Cannot update an expense to have no participants',
          );
        }
        for (const id of newParticipantIds) {
          if (!memberIds.has(id)) {
            throw new BadRequestError(
              `Participant ${id} is not a member of the group`,
            );
          }
        }

        const newAmountStr = dto.amount ?? expense.amount;
        const totalCents = toCents(newAmountStr);
        if (totalCents <= 0) {
          throw new BadRequestError('amount must be greater than zero');
        }

        const newSplitType: SplitTypeValue = dto.splitType ?? expense.splitType;
        const shares = computeSplitAmounts(
          newSplitType,
          totalCents,
          newParticipantIds,
        );

        await expense.update(
          {
            ...scalarUpdates,
            amount: fromCents(totalCents),
            paidBy: newPaidBy,
            splitType: newSplitType,
            // Changing who owes what re-opens the debt; the status refresh
            // below re-stamps it if the group is still fully settled.
            settledAt: null,
          },
          { transaction },
        );

        // Replace splits atomically.
        await ExpenseSplit.destroy({
          where: { expenseId: expense.id },
          transaction,
        });
        splits = await ExpenseSplit.bulkCreate(
          shares.map(s => ({
            expenseId: expense.id,
            userId: s.userId,
            owedAmount: fromCents(s.owedCents),
          })),
          { transaction },
        );
      } else {
        if (Object.keys(scalarUpdates).length > 0) {
          await expense.update(scalarUpdates, { transaction });
        }
        splits = await ExpenseSplit.findAll({
          where: { expenseId: expense.id },
          transaction,
        });
      }

      await ActivityService.record({
        type: ActivityType.EXPENSE_UPDATED,
        actorId,
        groupId: expense.groupId,
        entityType: 'expense',
        entityId: expense.id,
        metadata: {
          description: expense.description,
          amount: expense.amount,
          currency: expense.currency,
        },
        transaction,
      });

      await refreshGroupSettlementStatus(group, transaction);

      transaction.afterCommit(() => notifyGroupUpdated(expense.groupId));

      return toExpenseDetailDTO(expense, splits);
    });
  },

  async deleteExpense(actorId: string, expenseId: string): Promise<void> {
    await sequelize.transaction(async transaction => {
      const expense = await loadExpenseOr404(expenseId, transaction);
      const group = await loadGroupOr404(expense.groupId, transaction);
      await assertCanMutateExpense(expense, group, actorId, transaction);

      const snapshot = {
        description: expense.description,
        amount: expense.amount,
        currency: expense.currency,
        paidBy: expense.paidBy,
      };

      // Paranoid soft-delete — Expense remains in the DB with `deleted_at` set.
      // We deliberately do NOT cascade-delete ExpenseSplits so the historical
      // record survives. Balance/activity queries scope by `expense_id` and
      // the default paranoid filter excludes deleted rows.
      await expense.destroy({ transaction });

      await ActivityService.record({
        type: ActivityType.EXPENSE_DELETED,
        actorId,
        groupId: expense.groupId,
        entityType: 'expense',
        entityId: expense.id,
        metadata: snapshot,
        transaction,
      });

      await refreshGroupSettlementStatus(group, transaction);

      transaction.afterCommit(() => notifyGroupUpdated(expense.groupId));
    });
  },
};

export default ExpenseService;
