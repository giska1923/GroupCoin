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
import { GroupRole, InvitationStatus } from '../constants';
import { GroupRoleType, InvitationStatusType } from '../types';
import Group from './group';
import User from './user';

interface GroupInvitationAttributes {
  id: string;
  groupId: string;
  inviterId: string;
  inviteeEmail: string;
  inviteeUserId: string | null;
  role: GroupRoleType;
  status: InvitationStatusType;
  expiresAt: Date;
}

type GroupInvitationCreationAttributes = Optional<
  Omit<GroupInvitationAttributes, 'id'>,
  'inviteeUserId' | 'role' | 'status'
>;

@Table({
  tableName: 'group_invitations',
  modelName: 'GroupInvitation',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['group_id', 'invitee_email', 'status'],
      name: 'group_invitations_group_email_status',
    },
  ],
})
export default class GroupInvitation extends Model<
  GroupInvitationAttributes,
  GroupInvitationCreationAttributes
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
    field: 'inviter_id',
  })
  declare inviterId: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'invitee_email',
  })
  declare inviteeEmail: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: true,
    field: 'invitee_user_id',
  })
  declare inviteeUserId: string | null;

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
    type: DataType.STRING,
    allowNull: false,
    defaultValue: InvitationStatus.PENDING,
    validate: {
      isIn: [[...Object.values(InvitationStatus)]],
    },
  })
  declare status: InvitationStatusType;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    field: 'expires_at',
  })
  declare expiresAt: Date;

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

  @BelongsTo(() => Group, 'group_id')
  declare group?: Group;

  @BelongsTo(() => User, 'inviter_id')
  declare inviter?: User;

  @BelongsTo(() => User, 'invitee_user_id')
  declare invitee?: User;
}
