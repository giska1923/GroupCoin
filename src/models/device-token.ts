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
import User from './user';

interface DeviceTokenAttributes {
  id: string;
  userId: string;
  // The Expo push token (e.g. "ExponentPushToken[...]") used to deliver pushes
  // through Expo's push service.
  token: string;
  // Originating platform, so we can tailor payloads if needed later.
  platform: string;
}

type DeviceTokenCreationAttributes = Optional<
  DeviceTokenAttributes,
  'id'
>;

@Table({
  tableName: 'device_tokens',
  modelName: 'DeviceToken',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
})
export default class DeviceToken extends Model<
  DeviceTokenAttributes,
  DeviceTokenCreationAttributes
> {
  @IsUUID(4)
  @Column({
    primaryKey: true,
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
  })
  declare id: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    field: 'user_id',
  })
  declare userId: string;

  // Unique so a device that re-registers (or moves to another account) updates
  // the existing row instead of accumulating duplicates.
  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  declare token: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare platform: string;

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

  @BelongsTo(() => User, 'user_id')
  declare user?: User;
}
