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

/**
 * Returned by registration (and resend) when the account exists but still
 * needs email verification. Deliberately carries no tokens — the client must
 * verify the emailed code before a session is issued.
 */
export class PendingVerificationDTO {
  @Expose() email!: string;

  /** Always true here; lets the client branch on the response shape. */
  @Expose() verificationRequired!: boolean;

  /** Human-readable hint for the UI, e.g. "We sent a code to …". */
  @Expose() message!: string;
}
