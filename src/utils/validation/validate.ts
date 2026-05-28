/* eslint-disable @typescript-eslint/no-explicit-any */
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { NextFunction, Request, Response } from 'express';
import { NotFoundError } from '../../types';

type Source = 'body' | 'query';

const runValidation = async (DTOClass: any, payload: unknown) => {
  const dtoInstance = plainToInstance(DTOClass, payload, {
    enableImplicitConversion: true,
  });

  const errors = await validate(dtoInstance as object);
  if (errors.length > 0) {
    const formattedErrors = errors
      .map(err => Object.values(err.constraints || {}))
      .flat();
    // NOTE: Pre-existing quirk — this throws a 404 rather than 400. Kept for
    // backwards compatibility with the existing error handler behavior.
    throw new NotFoundError(
      JSON.stringify({
        message: 'Validation failed',
        errors: formattedErrors,
      }),
    );
  }
  return dtoInstance;
};

const makeValidator =
  (source: Source) =>
  (DTOClass: any) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const payload = source === 'body' ? req.body : req.query;
      await runValidation(DTOClass, payload);
      next();
    } catch (error) {
      next(error);
    }
  };

export const validateDTO = makeValidator('body');
export const validateQueryDTO = makeValidator('query');
