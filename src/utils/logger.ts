import { createLogger, format, Logger, transports } from 'winston';
import { DATE_FORMAT } from '../constants';
import config from '../config/app.config';

const appConfig = config();

class AppLogger {
  private logger: Logger;

  constructor(private context: string = '') {
    this.context = context; // app context (e.g. "UserService")

    this.logger = createLogger({
      level: 'info', // log level (e.g., 'info', 'warn', 'error')
      format: format.combine(
        format.timestamp({ format: DATE_FORMAT }),
        format.printf(({ level, message, timestamp }) => {
          return `${timestamp} [${level.toUpperCase()}]: ${message}`;
        }),
      ),
      // Where the logs are sent or stored
      transports: [
        new transports.Console(),
        new transports.File({ filename: 'error.log', level: 'error' }),
        new transports.File({ filename: 'app.log' }),
      ],
    });

    if (appConfig.env !== 'production') {
      this.logger.add(new transports.Console({ format: format.simple() }));
    }
  }

  private logMessage(level: string, message: string) {
    const logMessage = this.context ? `[${this.context}] ${message}` : message;
    this.logger.log({ level, message: logMessage });
  }

  log(message: string) {
    console.log(message);
    // this.logMessage('info', message); // Commented out for the Development phase
  }

  warn(message: string) {
    this.logMessage('warn', message);
  }

  error(message: string) {
    this.logMessage('error', message);
  }

  debug(message: string) {
    this.logMessage('debug', message);
  }
}

export default AppLogger;
