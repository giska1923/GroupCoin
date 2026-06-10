import { Server } from 'socket.io';
import { InvitationDTO } from '../dtos/response';
import { emitToUser } from './user-registry';

export const INVITATION_RECEIVED_EVENT = 'invitation:received';

let io: Server | null = null;

export const setSocketServer = (server: Server): void => {
  io = server;
};

export const notifyInvitationReceived = (invitation: InvitationDTO): void => {
  if (!io || !invitation.inviteeUserId) return;
  emitToUser(io, invitation.inviteeUserId, INVITATION_RECEIVED_EVENT, invitation);
};
