import { FeedbackTopic } from '../constants';

export type FeedbackTopicValue =
  (typeof FeedbackTopic)[keyof typeof FeedbackTopic];
