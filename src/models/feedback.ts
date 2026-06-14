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
import { FeedbackTopic } from '../constants';
import { FeedbackTopicValue } from '../types';
import User from './user';

interface FeedbackAttributes {
  id: string;
  userId: string;
  topic: FeedbackTopicValue;
  message: string;
}

type FeedbackCreationAttributes = Optional<
  Omit<FeedbackAttributes, 'id'>,
  never
>;

@Table({
  tableName: 'feedbacks',
  modelName: 'Feedback',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
})
export default class Feedback extends Model<
  FeedbackAttributes,
  FeedbackCreationAttributes
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
    validate: {
      isIn: [[...Object.values(FeedbackTopic)]],
    },
  })
  declare topic: FeedbackTopicValue;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  declare message: string;

  @Column({
    type: DataType.DATE,
    field: 'created_at',
    defaultValue: DataType.NOW,
  })
  declare createdAt: Date;

  @BelongsTo(() => User, 'user_id')
  declare user?: User;
}
