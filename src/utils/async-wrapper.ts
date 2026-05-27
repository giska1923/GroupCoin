import { Request, Response, NextFunction } from 'express';
import AppLogger from './logger';

const logger = new AppLogger(); // TODO: Add logging context

// Central async wrapper function
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
const asyncWrapper = (fn: Function) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fn(req, res, next); // Call the actual function
    } catch (error: unknown) {
      logger.error(`Async Error: ${(error as Error).message}`);
      next(error);
    }
  };
};

export default asyncWrapper;
