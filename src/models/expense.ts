import { Optional } from 'sequelize';
import {
  BelongsTo,
  Column,
  DataType,
  DeletedAt,
  ForeignKey,
  HasMany,
  IsUUID,
  Model,
  Table,
} from 'sequelize-typescript';
import { DEFAULT_CURRENCY, SplitType } from '../constants';
import { SplitTypeValue } from '../types';
import Group from './group';
import User from './user';
import ExpenseSplit from './expense-split';

interface ExpenseAttributes {
  id: string;
  groupId: string;
  paidBy: string;
  amount: string;
  description: string;
  currency: string;
  expenseDate: Date;
  splitType: SplitTypeValue;
  settledAt: Date | null;
  deletedAt: Date | null;
}

type ExpenseCreationAttributes = Optional<
  Omit<ExpenseAttributes, 'id' | 'deletedAt' | 'settledAt'>,
  'currency' | 'expenseDate' | 'splitType'
>;

@Table({
  tableName: 'expenses',
  modelName: 'Expense',
  timestamps: true,
  paranoid: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
})
export default class Expense extends Model<
  ExpenseAttributes,
  ExpenseCreationAttributes
> {
  @IsUUID(4)
  @Column({
    primaryKey: true,
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
  })
  declare id: string;

  @ForeignKey(() => Group)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    field: 'group_id',
  })
  declare groupId: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    field: 'paid_by',
  })
  declare paidBy: string;

  // DECIMAL is returned as a string by node-postgres to preserve precision.
  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    validate: {
      min: 0.01,
    },
  })
  declare amount: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare description: string;

  @Column({
    type: DataType.STRING(3),
    allowNull: false,
    defaultValue: DEFAULT_CURRENCY,
  })
  declare currency: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    field: 'expense_date',
    defaultValue: DataType.NOW,
  })
  declare expenseDate: Date;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: SplitType.EQUAL,
    field: 'split_type',
    validate: {
      isIn: [[...Object.values(SplitType)]],
    },
  })
  declare splitType: SplitTypeValue;

  // Stamped when the whole group reaches SETTLED_UP; null while the expense
  // still contributes to open debts. Cleared again if the debt re-opens
  // (split-affecting edit, or the covering settlement is deleted).
  @Column({
    type: DataType.DATE,
    allowNull: true,
    field: 'settled_at',
  })
  declare settledAt: Date | null;

  @Column({
    type: DataType.DATE,
    field: 'created_at',
    defaultValue: DataType.NOW,
  })
  declare createdAt: Date;

  @Column({
    type: DataType.DATE,
    field: 'updated_at',
    defaultValue: DataType.NOW,
  })
  declare updatedAt: Date;

  @DeletedAt
  @Column({ type: DataType.DATE, field: 'deleted_at' })
  declare deletedAt: Date | null;

  // Associations
  @BelongsTo(() => Group, 'group_id')
  declare group?: Group;

  @BelongsTo(() => User, 'paid_by')
  declare payer?: User;

  @HasMany(() => ExpenseSplit, 'expense_id')
  declare splits?: ExpenseSplit[];
}
