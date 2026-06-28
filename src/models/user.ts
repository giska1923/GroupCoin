import bcrypt from 'bcrypt';
import { Optional } from 'sequelize';
import {
  BeforeSave,
  Column,
  DataType,
  HasMany,
  IsUUID,
  Model,
  Table,
} from 'sequelize-typescript';
import { Role } from '../constants';
import { RoleType } from '../types';
import Group from './group';
import GroupMember from './group-member';
import Expense from './expense';
import ExpenseSplit from './expense-split';
import Settlement from './settlement';
import Activity from './activity';
import RefreshToken from './refresh-token';

const BCRYPT_ROUNDS = 10;

interface UserAttributes {
  id: string;
  name: string;
  email: string;
  contact: string;
  // Null for accounts created through an external identity provider
  // (e.g. Google), which never set a local password.
  passwordHash: string | null;
  googleId: string | null;
  role: RoleType;
}

type UserCreationAttributes = Optional<
  Omit<UserAttributes, 'id'>,
  'contact' | 'role' | 'passwordHash' | 'googleId'
>;

@Table({
  tableName: 'users',
  modelName: 'User',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
})
export default class User extends Model<
  UserAttributes,
  UserCreationAttributes
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
    type: DataType.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
    set(value: string) {
      this.setDataValue('email', value.toLowerCase());
    },
  })
  declare email: string;

  @Column({ type: DataType.STRING, unique: true })
  declare contact: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'password_hash',
  })
  declare passwordHash: string | null;

  // Google's stable user identifier (the `sub` claim). Lets us recognise a
  // returning Google user even if they change their email/name on Google.
  @Column({
    type: DataType.STRING,
    allowNull: true,
    unique: true,
    field: 'google_id',
  })
  declare googleId: string | null;

  @Column({
    allowNull: false,
    type: DataType.STRING,
    defaultValue: Role.BASIC,
    validate: {
      isIn: [[...Object.values(Role)]],
    },
  })
  declare role: RoleType;

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
  @HasMany(() => Group, 'owner_id')
  declare ownedGroups?: Group[];

  @HasMany(() => GroupMember, 'user_id')
  declare memberships?: GroupMember[];

  @HasMany(() => Expense, 'paid_by')
  declare paidExpenses?: Expense[];

  @HasMany(() => ExpenseSplit, 'user_id')
  declare expenseSplits?: ExpenseSplit[];

  @HasMany(() => Settlement, 'from_user_id')
  declare settlementsPaid?: Settlement[];

  @HasMany(() => Settlement, 'to_user_id')
  declare settlementsReceived?: Settlement[];

  @HasMany(() => Activity, 'actor_id')
  declare activities?: Activity[];

  @HasMany(() => RefreshToken, 'user_id')
  declare refreshTokens?: RefreshToken[];

  // Treat any assignment to `passwordHash` as a plain password and hash it.
  // Allows `User.create({ passwordHash: rawPassword })` from the service layer.
  @BeforeSave
  static async hashPasswordHook(instance: User): Promise<void> {
    if (instance.changed('passwordHash') && instance.passwordHash) {
      instance.passwordHash = await bcrypt.hash(
        instance.passwordHash,
        BCRYPT_ROUNDS,
      );
    }
  }

  async comparePassword(plainPassword: string): Promise<boolean> {
    // Google-only accounts have no local password, so there is nothing to
    // compare against — treat it as a failed password login.
    if (!this.passwordHash) return false;
    return bcrypt.compare(plainPassword, this.passwordHash);
  }
}
