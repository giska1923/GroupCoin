import { Response } from 'express';
import { AppError } from '../types/error';
import AppLogger from './logger';

const logger = new AppLogger();

class ErrorHandler {
  private sendResponse(error: Error, response: Response) {
    if (error instanceof AppError) {
      const serializedError = error.serialize();
      response.status(error.statusCode || 500).send(serializedError);
      return;
    }

    response.status(500).send({ message: `Error: ${error.message}` });
  }

  public async handleError(error: Error, response: Response): Promise<void> {
    logger.error(error.message);
    // await fireMonitoringMetric(error);
    this.sendResponse(error, response);
  }

  public isTrustedError(error: Error) {
    return error instanceof AppError;
  }
}

const handler = new ErrorHandler();
export default handler;
