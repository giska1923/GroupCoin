import app from './app';
import config from './config/app.config';
import AppLogger from './utils/logger';
import handler from '../src/utils/error-handler';

const appConfig = config();
const logger = new AppLogger('Server');

const startServer = async () => {
  app.listen(appConfig.port, () => {
    logger.log(`Server running on http://localhost:${appConfig.port}`);
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
