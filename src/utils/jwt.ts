import jwt, { SignOptions } from 'jsonwebtoken';
import config from '../config/app.config';
import { AuthenticationError, JwtPayload } from '../types';

const { jwt: jwtConfig } = config();

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, jwtConfig.secret, {
    expiresIn: jwtConfig.accessExpiresIn as SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, jwtConfig.secret);
    if (typeof decoded === 'string') {
      throw new AuthenticationError('Invalid token payload');
    }
    return decoded as JwtPayload;
  } catch (error) {
    if (error instanceof AuthenticationError) throw error;
    throw new AuthenticationError('Invalid or expired token');
  }
}
