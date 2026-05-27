import { Optional } from 'sequelize';
import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  HasMany,
  IsUUID,
  Model,
  Table,
} from 'sequelize-typescript';
import { DEFAULT_CURRENCY } from '../constants';
import User from './user';
import GroupMember from './group-member';
import Expense from './expense';
import Settlement from './settlement';
import Activity from './activity';

interface GroupAttributes {
  id: string;
  name: string;
  description: string | null;
  defaultCurrency: string;
  ownerId: string;
}

type GroupCreationAttributes = Optional<
  Omit<GroupAttributes, 'id'>,
  'description' | 'defaultCurrency'
>;

@Table({
  tableName: 'groups',
  modelName: 'Group',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
})
export default class Group extends Model<
  GroupAttributes,
  GroupCreationAttributes
> {
  @IsUUID(4)
  @Column({
    primaryKey: true,
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
  })
  declare id: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare name: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  declare description: string | null;

  @Column({
    type: DataType.STRING(3),
    allowNull: false,
    defaultValue: DEFAULT_CURRENCY,
    field: 'default_currency',
  })
  declare defaultCurrency: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    field: 'owner_id',
  })
  declare ownerId: string;

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
  @BelongsTo(() => User, 'owner_id')
  declare owner?: User;

  @HasMany(() => GroupMember, 'group_id')
  declare members?: GroupMember[];

  @HasMany(() => Expense, 'group_id')
  declare expenses?: Expense[];

  @HasMany(() => Settlement, 'group_id')
  declare settlements?: Settlement[];

  @HasMany(() => Activity, 'group_id')
  declare activities?: Activity[];
}
