import { Server } from 'socket.io';
import { GroupMember } from '../models';
import AppLogger from '../utils/logger';
import { emitToUser } from './user-registry';

/**
 * Emitted to every member of a group whenever its data changes (expense or
 * settlement created/updated/deleted). Payload: `{ groupId }`. Clients use it
 * as an invalidation signal and refetch whatever group queries they hold.
 */
export const GROUP_UPDATED_EVENT = 'group:updated';

const logger = new AppLogger('GroupNotifier');

let io: Server | null = null;

export const setGroupSocketServer = (server: Server): void => {
  io = server;
};

/**
 * Fire-and-forget broadcast to all current members of the group (including
 * the actor — their other devices need the signal too). Call after the
 * mutating transaction has committed so clients never refetch stale data.
 */
export const notifyGroupUpdated = (groupId: string): void => {
  if (!io) return;
  const server = io;

  void GroupMember.findAll({ where: { groupId }, attributes: ['userId'] })
    .then(members => {
      for (const member of members) {
        emitToUser(server, member.userId, GROUP_UPDATED_EVENT, { groupId });
      }
    })
    .catch((error: unknown) =>
      logger.error(
        `Failed to broadcast group update for ${groupId}: ${
          (error as Error).message
        }`,
      ),
    );
};
