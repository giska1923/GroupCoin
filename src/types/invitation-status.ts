import { InvitationStatus } from '../constants';

export type InvitationStatusType =
  (typeof InvitationStatus)[keyof typeof InvitationStatus];
