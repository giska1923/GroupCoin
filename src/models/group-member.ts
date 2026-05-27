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
import { GroupRole } from '../constants';
import { GroupRoleType } from '../types';
import Group from './group';
import User from './user';

interface GroupMemberAttributes {
  id: string;
  groupId: string;
  userId: string;
  role: GroupRoleType;
}

type GroupMemberCreationAttributes = Optional<
  Omit<GroupMemberAttributes, 'id'>,
  'role'
>;

@Table({
  tableName: 'group_members',
  modelName: 'GroupMember',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['group_id', 'user_id'],
      name: 'group_members_group_id_user_id_unique',
    },
  ],
})
export default class GroupMember extends Model<
  GroupMemberAttributes,
  GroupMemberCreationAttributes
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
    field: 'user_id',
  })
  declare userId: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: GroupRole.MEMBER,
    validate: {
      isIn: [[...Object.values(GroupRole)]],
    },
  })
  declare role: GroupRoleType;

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

  @BelongsTo(() => User, 'user_id')
  declare user?: User;
}
