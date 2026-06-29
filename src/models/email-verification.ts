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

interface EmailVerificationAttributes {
  id: string;
  userId: string;
  // SHA-256 of the 6-digit code — never store the raw value so a DB leak can't
  // be replayed to verify an account.
  codeHash: string;
  expiresAt: Date;
  // Set the moment the code is successfully redeemed, so a code is single-use.
  consumedAt: Date | null;
  // Number of failed guesses against this code; used to lock it after too many
  // attempts so codes can't be brute-forced.
  attempts: number;
}

type EmailVerificationCreationAttributes = Optional<
  Omit<EmailVerificationAttributes, 'id'>,
  'consumedAt' | 'attempts'
>;

@Table({
  tableName: 'email_verifications',
  modelName: 'EmailVerification',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
})
export default class EmailVerification extends Model<
  EmailVerificationAttributes,
  EmailVerificationCreationAttributes
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
    field: 'code_hash',
  })
  declare codeHash: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    field: 'expires_at',
  })
  declare expiresAt: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    field: 'consumed_at',
  })
  declare consumedAt: Date | null;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  declare attempts: number;

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

  get isRedeemable(): boolean {
    return this.consumedAt === null && this.expiresAt.getTime() > Date.now();
  }
}
