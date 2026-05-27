import { Socket } from 'socket.io';
import { disconnectHandler, messageHandler } from './handlers';

const stream = (socket: Socket) => {
  console.log(`Client connected, socket id: ${socket.id}`);

  socket.on('message', data => messageHandler(socket, data));

  socket.on('disconnect', () => disconnectHandler(socket));
};

export default stream;
