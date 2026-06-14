import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { FeedbackTopic } from '../../constants';

export class CreateFeedbackDTO {
  @IsString()
  @IsNotEmpty()
  @IsIn([...Object.values(FeedbackTopic)])
  topic!: (typeof FeedbackTopic)[keyof typeof FeedbackTopic];

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message!: string;
}
