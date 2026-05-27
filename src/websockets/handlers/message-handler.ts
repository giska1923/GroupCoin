import { Socket } from 'socket.io';

export const messageHandler = (socket: Socket, data: unknown) => {
  console.log(`Received message: ${data}`);

  socket.emit('response', `Hello from backend! Received messages: ${data}`);
};
