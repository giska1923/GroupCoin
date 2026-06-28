import { Expose, Type } from 'class-transformer';
import { UserDTO } from './user.dto';

export class AuthResponseDTO {
  @Expose()
  @Type(() => UserDTO)
  user!: UserDTO;

  /** Short-lived bearer token sent on every authenticated request. */
  @Expose() accessToken!: string;

  /** Long-lived token exchanged at /auth/refresh for a new access token. */
  @Expose() refreshToken!: string;
}
