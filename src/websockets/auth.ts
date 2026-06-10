import { Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt';
import { AuthenticationError } from '../types';

export interface AuthenticatedSocket extends Socket {
  userId: string;
  userEmail: string;
}

export const authenticateSocket = (socket: Socket): AuthenticatedSocket => {
  const token =
    (socket.handshake.auth?.token as string | undefined) ??
    (socket.handshake.query?.token as string | undefined);

  if (!token) {
    throw new AuthenticationError('Missing socket authentication token');
  }

  const payload = verifyToken(token);
  const authenticated = socket as AuthenticatedSocket;
  authenticated.userId = payload.sub;
  authenticated.userEmail = payload.email;
  return authenticated;
};
