import { Socket } from 'socket.io';

export const disconnectHandler = (socket: Socket) => {
  console.log(`Client disconnected: ${socket.id}`);
};
