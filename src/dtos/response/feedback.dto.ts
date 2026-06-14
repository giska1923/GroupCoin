import { Expose } from 'class-transformer';
import { FeedbackTopicValue } from '../../types';

export class FeedbackDTO {
  @Expose() id!: string;
  @Expose() userId!: string;
  @Expose() topic!: FeedbackTopicValue;
  @Expose() message!: string;
  @Expose() createdAt!: Date;
}
