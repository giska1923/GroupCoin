/* eslint-disable @typescript-eslint/no-explicit-any */
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { NextFunction, Request, Response } from 'express';
import { NotFoundError } from '../../types';

export const validateDTO = (DTOClass: any) => {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const dtoInstance = plainToInstance(DTOClass, req.body);

      const errors = await validate(dtoInstance);

      if (errors.length > 0) {
        const formattedErrors = errors
          .map(err => Object.values(err.constraints || {}))
          .flat();

        throw new NotFoundError(
          JSON.stringify({
            message: 'Validation failed',
            errors: formattedErrors,
          }),
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
