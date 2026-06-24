// MUST be the first import — polyfills `Reflect.getMetadata` for
// class-validator / class-transformer / sequelize-typescript decorators.
import 'reflect-metadata';

import http from 'http';

import app from './app';
import config from './config/app.config';
import AppLogger from './utils/logger';
import handler from '../src/utils/error-handler';
import { initializeSocketServer } from './websockets/server';

const appConfig = config();
const logger = new AppLogger('Server');

const startServer = async () => {
  const server = http.createServer(app);

  initializeSocketServer(server);

  server.listen(appConfig.port, () => {
    logger.log(`Server listening on port ${appConfig.port}`);
  });
};

startServer();

// Handle process-level errors (Handles Unhandled Rejection as well)
process.on('uncaughtException', error => {
  // handler.handleError(error);
  logger.error(`Uncaught Exception: ${error.message}`);
  if (!handler.isTrustedError(error)) {
    process.exit(1);
  }
});

process.on('SIGTERM', () => {
  logger.log('SIGTERM received. Cleaning up...');
  process.exit(0);
});
