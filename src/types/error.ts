export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code: string = 'GENERIC_ERROR',
    public isOperational: boolean = true,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }

  serialize(): { message: string; code: string; statusCode: number } {
    return {
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
    };
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404, 'NOT_FOUND');
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, 400, 'BAD_REQUEST');
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string) {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * Raised when a user with the right password tries to log in but hasn't yet
 * verified their email. The dedicated `EMAIL_NOT_VERIFIED` code lets the
 * client route them to the verification screen instead of showing a generic
 * error.
 */
export class EmailNotVerifiedError extends AppError {
  constructor(message: string = 'Please verify your email to continue') {
    super(message, 403, 'EMAIL_NOT_VERIFIED');
  }
}
