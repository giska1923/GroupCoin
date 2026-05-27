import { ErrorRequestHandler, Request, Response, NextFunction } from 'express';
import handler from '../utils/error-handler';

export const errorHandler: ErrorRequestHandler = (
  error: Error,
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  handler.handleError(error, res);
  next();
};
