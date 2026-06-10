import { Server } from 'socket.io';

const userSockets = new Map<string, Set<string>>();

export const registerUserSocket = (userId: string, socketId: string): void => {
  const sockets = userSockets.get(userId) ?? new Set<string>();
  sockets.add(socketId);
  userSockets.set(userId, sockets);
};

export const unregisterUserSocket = (
  userId: string,
  socketId: string,
): void => {
  const sockets = userSockets.get(userId);
  if (!sockets) return;

  sockets.delete(socketId);
  if (sockets.size === 0) {
    userSockets.delete(userId);
  }
};

export const emitToUser = (
  io: Server,
  userId: string,
  event: string,
  payload: unknown,
): void => {
  const sockets = userSockets.get(userId);
  if (!sockets || sockets.size === 0) return;

  for (const socketId of sockets) {
    io.to(socketId).emit(event, payload);
  }
};

export const isUserOnline = (userId: string): boolean => {
  const sockets = userSockets.get(userId);
  return sockets !== undefined && sockets.size > 0;
};
