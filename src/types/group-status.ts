import { GroupStatus } from '../constants';

export type GroupStatusType = (typeof GroupStatus)[keyof typeof GroupStatus];
