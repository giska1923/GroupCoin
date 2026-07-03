import { Expose, Type } from 'class-transformer';
import { SplitTypeValue } from '../../types';

export class ExpenseSplitDTO {
  @Expose() id!: string;
  @Expose() expenseId!: string;
  @Expose() userId!: string;
  @Expose() owedAmount!: string;
}

export class ExpenseDTO {
  @Expose() id!: string;
  @Expose() groupId!: string;
  @Expose() paidBy!: string;
  @Expose() amount!: string;
  @Expose() description!: string;
  @Expose() currency!: string;
  @Expose() expenseDate!: Date;
  @Expose() splitType!: SplitTypeValue;
  @Expose() settledAt!: Date | null;
  @Expose() createdAt!: Date;
  @Expose() updatedAt!: Date;
}

export class ExpenseDetailDTO {
  @Expose()
  @Type(() => ExpenseDTO)
  expense!: ExpenseDTO;

  @Expose()
  @Type(() => ExpenseSplitDTO)
  splits!: ExpenseSplitDTO[];
}
