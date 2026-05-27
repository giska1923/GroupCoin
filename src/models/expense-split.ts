import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  IsUUID,
  Model,
  Table,
} from 'sequelize-typescript';
import Expense from './expense';
import User from './user';

interface ExpenseSplitAttributes {
  id: string;
  expenseId: string;
  userId: string;
  owedAmount: string;
}

type ExpenseSplitCreationAttributes = Omit<ExpenseSplitAttributes, 'id'>;

@Table({
  tableName: 'expense_splits',
  modelName: 'ExpenseSplit',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['expense_id', 'user_id'],
      name: 'expense_splits_expense_id_user_id_unique',
    },
  ],
})
export default class ExpenseSplit extends Model<
  ExpenseSplitAttributes,
  ExpenseSplitCreationAttributes
> {
  @IsUUID(4)
  @Column({
    primaryKey: true,
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
  })
  declare id: string;

  @ForeignKey(() => Expense)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    field: 'expense_id',
  })
  declare expenseId: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    field: 'user_id',
  })
  declare userId: string;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    field: 'owed_amount',
    validate: {
      min: 0,
    },
  })
  declare owedAmount: string;

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

  // Associations
  @BelongsTo(() => Expense, 'expense_id')
  declare expense?: Expense;

  @BelongsTo(() => User, 'user_id')
  declare user?: User;
}
