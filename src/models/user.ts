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

const BCRYPT_ROUNDS = 10;

interface UserAttributes {
  id: string;
  name: string;
  email: string;
  contact: string;
  passwordHash: string;
  role: RoleType;
}

type UserCreationAttributes = Optional<
  Omit<UserAttributes, 'id'>,
  'contact' | 'role'
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
    allowNull: false,
    field: 'password_hash',
  })
  declare passwordHash: string;

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
    return bcrypt.compare(plainPassword, this.passwordHash);
  }
}
