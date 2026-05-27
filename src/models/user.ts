import { Column, DataType, IsUUID, Model, Table } from 'sequelize-typescript';
import { Role } from '../constants';
import { RoleType } from '../types';
import { Optional } from 'sequelize';

interface UserAttributes {
  id: number;
  name: string;
  email: string;
  contact: string;
  password: string;
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
    // validate: {
    //   min: 8,
    //   max: 128,
    //   is: /^(?=.*[a-zA-Z])(?=.*[0-9])/,
    // },
  })
  declare password: string;

  // @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  // isVerified: boolean;

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
}
