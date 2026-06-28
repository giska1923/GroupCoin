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

interface RefreshTokenAttributes {
  id: string;
  userId: string;
  // SHA-256 of the opaque refresh token — never store the raw value so a DB
  // leak can't be replayed against the API.
  tokenHash: string;
  expiresAt: Date;
  // Set when the token is rotated (on refresh) or explicitly revoked (logout).
  revokedAt: Date | null;
}

type RefreshTokenCreationAttributes = Optional<
  Omit<RefreshTokenAttributes, 'id'>,
  'revokedAt'
>;

@Table({
  tableName: 'refresh_tokens',
  modelName: 'RefreshToken',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
})
export default class RefreshToken extends Model<
  RefreshTokenAttributes,
  RefreshTokenCreationAttributes
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

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
    field: 'token_hash',
  })
  declare tokenHash: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    field: 'expires_at',
  })
  declare expiresAt: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    field: 'revoked_at',
  })
  declare revokedAt: Date | null;

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

  get isActive(): boolean {
    return this.revokedAt === null && this.expiresAt.getTime() > Date.now();
  }
}
