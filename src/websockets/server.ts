import { Server } from 'socket.io';
import http from 'http';
import { defaultCorsConfig } from './config';
import { setGroupSocketServer } from './group-notifier';
import { setSocketServer } from './invitation-notifier';
import stream from './stream';

export const initializeSocketServer = (server: http.Server): Server => {
  const io = new Server(server, {
    cors: defaultCorsConfig,
  });

  setSocketServer(io);
  setGroupSocketServer(io);
  io.on('connection', stream);

  return io;
};
