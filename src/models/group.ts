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
import { DEFAULT_CURRENCY, GroupStatus } from '../constants';
import { GroupStatusType } from '../types';
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
  imageUrl: string | null;
  ownerId: string;
  status: GroupStatusType;
}

type GroupCreationAttributes = Optional<
  Omit<GroupAttributes, 'id'>,
  'description' | 'defaultCurrency' | 'imageUrl' | 'status'
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

  // Either an https URL or a base64 data URI uploaded from the app.
  @Column({
    type: DataType.TEXT,
    allowNull: true,
    field: 'image_url',
  })
  declare imageUrl: string | null;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    field: 'owner_id',
  })
  declare ownerId: string;

  // ACTIVE while any member owes money; SETTLED_UP once all balances are zero.
  @Column({
    type: DataType.STRING(16),
    allowNull: false,
    defaultValue: GroupStatus.ACTIVE,
  })
  declare status: GroupStatusType;

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
