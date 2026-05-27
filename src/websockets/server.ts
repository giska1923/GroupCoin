import { Server } from 'socket.io';
import http from 'http';
import { defaultCorsConfig } from './config';
import stream from './stream';

export const initializeSocketServer = (server: http.Server): Server => {
  const io = new Server(server, {
    cors: defaultCorsConfig,
  });

  io.on('connection', stream);

  return io;
};
