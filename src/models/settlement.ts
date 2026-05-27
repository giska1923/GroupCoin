import { Optional } from 'sequelize';
import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  IsUUID,
  Model,
  Table,
} from 'sequelize-typescript';
import { DEFAULT_CURRENCY } from '../constants';
import Group from './group';
import User from './user';

interface SettlementAttributes {
  id: string;
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amount: string;
  currency: string;
  settledAt: Date;
  note: string | null;
}

type SettlementCreationAttributes = Optional<
  Omit<SettlementAttributes, 'id'>,
  'currency' | 'settledAt' | 'note'
>;

@Table({
  tableName: 'settlements',
  modelName: 'Settlement',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  validate: {
    fromAndToMustDiffer(this: Settlement) {
      if (this.fromUserId === this.toUserId) {
        throw new Error('Settlement payer and payee must be different users.');
      }
    },
  },
})
export default class Settlement extends Model<
  SettlementAttributes,
  SettlementCreationAttributes
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
    field: 'from_user_id',
  })
  declare fromUserId: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    field: 'to_user_id',
  })
  declare toUserId: string;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    validate: {
      min: 0.01,
    },
  })
  declare amount: string;

  @Column({
    type: DataType.STRING(3),
    allowNull: false,
    defaultValue: DEFAULT_CURRENCY,
  })
  declare currency: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    field: 'settled_at',
    defaultValue: DataType.NOW,
  })
  declare settledAt: Date;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  declare note: string | null;

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
  @BelongsTo(() => Group, 'group_id')
  declare group?: Group;

  @BelongsTo(() => User, 'from_user_id')
  declare fromUser?: User;

  @BelongsTo(() => User, 'to_user_id')
  declare toUser?: User;
}
