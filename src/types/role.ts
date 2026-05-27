import { Role } from '../constants';

export type RoleType = (typeof Role)[keyof typeof Role];
