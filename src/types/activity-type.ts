import { ActivityType } from '../constants';

export type ActivityTypeValue = (typeof ActivityType)[keyof typeof ActivityType];
