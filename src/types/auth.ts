import { RoleType } from './role';

export interface JwtPayload {
  sub: string;
  email: string;
  role: RoleType;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: RoleType;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
