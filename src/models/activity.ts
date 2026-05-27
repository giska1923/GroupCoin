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
import { ActivityType } from '../constants';
import { ActivityTypeValue } from '../types';
import Group from './group';
import User from './user';

interface ActivityAttributes {
  id: string;
  groupId: string | null;
  actorId: string;
  type: ActivityTypeValue;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown>;
}

type ActivityCreationAttributes = Optional<
  Omit<ActivityAttributes, 'id'>,
  'groupId' | 'entityType' | 'entityId' | 'metadata'
>;

@Table({
  tableName: 'activities',
  modelName: 'Activity',
  timestamps: true,
  createdAt: 'created_at',
  // Activities are an append-only event log — `updatedAt` is not meaningful.
  updatedAt: false,
})
export default class Activity extends Model<
  ActivityAttributes,
  ActivityCreationAttributes
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
    allowNull: true,
    field: 'group_id',
  })
  declare groupId: string | null;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    field: 'actor_id',
  })
  declare actorId: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    validate: {
      isIn: [[...Object.values(ActivityType)]],
    },
  })
  declare type: ActivityTypeValue;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'entity_type',
  })
  declare entityType: string | null;

  @Column({
    type: DataType.UUID,
    allowNull: true,
    field: 'entity_id',
  })
  declare entityId: string | null;

  // JSONB snapshot of relevant data (amount, names, etc.) so the activity log
  // stays meaningful even after the referenced entity is deleted.
  @Column({
    type: DataType.JSONB,
    allowNull: false,
    defaultValue: {},
  })
  declare metadata: Record<string, unknown>;

  @Column({
    type: DataType.DATE,
    field: 'created_at',
    defaultValue: DataType.NOW,
  })
  declare createdAt: Date;

  // Associations
  @BelongsTo(() => Group, 'group_id')
  declare group?: Group;

  @BelongsTo(() => User, 'actor_id')
  declare actor?: User;
}
