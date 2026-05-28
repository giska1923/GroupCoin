import {
  CurrencyAmountDTO,
  SimplifiedTransferDTO,
  UserBalanceDTO,
  UserDTO,
} from '../dtos/response';
import { Expense, ExpenseSplit, GroupMember, User } from '../models';
import { fromCents, toCents } from '../utils/money';
import { mapToClass } from '../utils/validation/class-mapper';
import { assertMember, loadGroupOr404 } from './group-access.service';

/**
 * Internal representation: userId -> currency -> cents.
 * Positive cents = group owes the user (they paid more than their share).
 * Negative cents = user owes the group.
 */
type BalanceMap = Map<string, Map<string, number>>;

const addToBalance = (
  map: BalanceMap,
  userId: string,
  currency: string,
  cents: number,
): void => {
  let userMap = map.get(userId);
  if (!userMap) {
    userMap = new Map();
    map.set(userId, userMap);
  }
  userMap.set(currency, (userMap.get(currency) ?? 0) + cents);
};

/**
 * Compute net balances for every member of a group, in cents per currency.
 *
 * Strategy: two queries (expenses, splits) joined in memory to avoid N+1.
 * Settlements are NOT yet included — they will be subtracted here once the
 * Settlement endpoints land.
 */
const computeNetBalances = async (groupId: string): Promise<BalanceMap> => {
  const balances: BalanceMap = new Map();

  const expenses = await Expense.findAll({ where: { groupId } });
  if (expenses.length === 0) return balances;

  const expenseIds = expenses.map(e => e.id);
  const splits = await ExpenseSplit.findAll({
    where: { expenseId: expenseIds },
  });

  const splitsByExpense = new Map<string, ExpenseSplit[]>();
  for (const split of splits) {
    const list = splitsByExpense.get(split.expenseId) ?? [];
    list.push(split);
    splitsByExpense.set(split.expenseId, list);
  }

  for (const expense of expenses) {
    const amountCents = toCents(expense.amount);
    addToBalance(balances, expense.paidBy, expense.currency, amountCents);

    const expenseSplits = splitsByExpense.get(expense.id) ?? [];
    for (const split of expenseSplits) {
      addToBalance(
        balances,
        split.userId,
        expense.currency,
        -toCents(split.owedAmount),
      );
    }
  }

  return balances;
};

/**
 * Greedy debt simplification per currency. The number of transfers produced
 * is at most (N - 1) where N is the number of users with a non-zero balance
 * in that currency — strictly better than naïve "pair every debtor with
 * every creditor".
 */
const simplifyForCurrency = (
  perUserCents: Map<string, number>,
  currency: string,
): SimplifiedTransferDTO[] => {
  const creditors: { userId: string; cents: number }[] = [];
  const debtors: { userId: string; cents: number }[] = [];

  for (const [userId, cents] of perUserCents) {
    if (cents > 0) creditors.push({ userId, cents });
    else if (cents < 0) debtors.push({ userId, cents: -cents });
  }

  // Largest amounts first so the greedy match is stable and minimal.
  creditors.sort((a, b) => b.cents - a.cents);
  debtors.sort((a, b) => b.cents - a.cents);

  const transfers: SimplifiedTransferDTO[] = [];
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    const amount = Math.min(creditor.cents, debtor.cents);

    transfers.push(
      mapToClass(
        {
          fromUserId: debtor.userId,
          toUserId: creditor.userId,
          amount: fromCents(amount),
          currency,
        },
        SimplifiedTransferDTO,
      ),
    );

    creditor.cents -= amount;
    debtor.cents -= amount;
    if (creditor.cents === 0) ci++;
    if (debtor.cents === 0) di++;
  }

  return transfers;
};

const BalanceService = {
  async getGroupBalances(
    actorId: string,
    groupId: string,
  ): Promise<UserBalanceDTO[]> {
    await loadGroupOr404(groupId);
    await assertMember(groupId, actorId);

    const balances = await computeNetBalances(groupId);

    // Load every member so we can include users that *could* have a balance
    // even though the iteration order below is driven by users with activity.
    const members = await GroupMember.findAll({
      where: { groupId },
      order: [['created_at', 'ASC']],
    });
    const users = await User.findAll({
      where: { id: members.map(m => m.userId) },
    });
    const userById = new Map(users.map(u => [u.id, u]));

    const result: UserBalanceDTO[] = [];
    for (const member of members) {
      const userBalances = balances.get(member.userId);
      const items: CurrencyAmountDTO[] = [];
      if (userBalances) {
        for (const [currency, cents] of userBalances) {
          if (cents === 0) continue;
          items.push(
            mapToClass({ currency, amount: fromCents(cents) }, CurrencyAmountDTO),
          );
        }
      }
      if (items.length === 0) continue;

      const user = userById.get(member.userId);
      result.push(
        mapToClass(
          {
            userId: member.userId,
            user: user ? mapToClass(user, UserDTO) : undefined,
            balances: items,
          },
          UserBalanceDTO,
        ),
      );
    }
    return result;
  },

  async getSimplifiedTransfers(
    actorId: string,
    groupId: string,
  ): Promise<SimplifiedTransferDTO[]> {
    await loadGroupOr404(groupId);
    await assertMember(groupId, actorId);

    const balances = await computeNetBalances(groupId);

    // Re-pivot: currency -> (userId -> cents)
    const byCurrency = new Map<string, Map<string, number>>();
    for (const [userId, userMap] of balances) {
      for (const [currency, cents] of userMap) {
        if (cents === 0) continue;
        let bucket = byCurrency.get(currency);
        if (!bucket) {
          bucket = new Map();
          byCurrency.set(currency, bucket);
        }
        bucket.set(userId, cents);
      }
    }

    const transfers: SimplifiedTransferDTO[] = [];
    for (const [currency, perUserCents] of byCurrency) {
      transfers.push(...simplifyForCurrency(perUserCents, currency));
    }
    return transfers;
  },
};

export default BalanceService;
