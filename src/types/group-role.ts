import { GroupRole } from '../constants';

export type GroupRoleType = (typeof GroupRole)[keyof typeof GroupRole];
