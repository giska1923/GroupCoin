import { Socket } from 'socket.io';
import AppLogger from '../utils/logger';
import { AuthenticationError } from '../types';
import { authenticateSocket } from './auth';
import { disconnectHandler } from './handlers';
import { registerUserSocket, unregisterUserSocket } from './user-registry';

const logger = new AppLogger('WebSocket');

const stream = (socket: Socket) => {
  let userId: string | null = null;

  try {
    const authenticated = authenticateSocket(socket);
    userId = authenticated.userId;
    registerUserSocket(userId, socket.id);
    logger.log(`Client connected: user=${userId}, socket=${socket.id}`);
  } catch (error) {
    const message =
      error instanceof AuthenticationError
        ? error.message
        : 'Socket authentication failed';
    logger.error(message);
    socket.emit('error', { message });
    socket.disconnect(true);
    return;
  }

  socket.on('disconnect', () => {
    if (userId) {
      unregisterUserSocket(userId, socket.id);
    }
    disconnectHandler(socket);
  });
};

export default stream;
