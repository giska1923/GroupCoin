import { UniqueConstraintError } from 'sequelize';
import { Role, InvitationStatus } from '../constants';
import {
  GoogleLoginDTO,
  LoginDTO,
  RegisterDTO,
  ResendVerificationDTO,
  VerifyEmailDTO,
} from '../dtos/request';
import {
  AuthResponseDTO,
  PendingVerificationDTO,
  UserDTO,
} from '../dtos/response';
import { GroupInvitation, User } from '../models';
import {
  AuthenticationError,
  BadRequestError,
  EmailNotVerifiedError,
  NotFoundError,
} from '../types';
import { verifyGoogleIdToken } from '../utils/google';
import { mapToClass } from '../utils/validation/class-mapper';
import EmailVerificationService from './email-verification.service';
import TokenService from './token.service';

const pendingVerification = (email: string): PendingVerificationDTO =>
  mapToClass(
    {
      email,
      verificationRequired: true,
      message: `We sent a 6-digit verification code to ${email}. Enter it to finish creating your account.`,
    },
    PendingVerificationDTO,
  );

const issueAuthResponse = async (user: User): Promise<AuthResponseDTO> => {
  const { accessToken, refreshToken } = await TokenService.issueTokens(user);
  return mapToClass(
    { user: mapToClass(user, UserDTO), accessToken, refreshToken },
    AuthResponseDTO,
  );
};

// Attach any invitations that were addressed to this email before the user
// had an account, so they show up in the invitee's inbox after signup.
const linkPendingInvitations = async (user: User): Promise<void> => {
  await GroupInvitation.update(
    { inviteeUserId: user.id },
    {
      where: {
        inviteeEmail: user.email,
        inviteeUserId: null,
        status: InvitationStatus.PENDING,
      },
    },
  );
};

const AuthService = {
  /**
   * Registers a new email/password account but does NOT issue a session: the
   * user must first prove ownership of their email by entering the code we send
   * here. Returns a {@link PendingVerificationDTO} instead of tokens.
   *
   * If an *unverified* account already exists for this email (an abandoned
   * signup), we treat the call as a resume: update the details and re-send a
   * fresh code rather than rejecting it.
   */
  async register(dto: RegisterDTO): Promise<PendingVerificationDTO> {
    const email = dto.email.toLowerCase();
    const existing = await User.findOne({ where: { email } });

    if (existing) {
      if (existing.emailVerified) {
        throw new BadRequestError(
          'An account with this email already exists',
        );
      }
      // Resume an abandoned signup: refresh the details and re-issue a code.
      existing.name = dto.name;
      existing.passwordHash = dto.password;
      if (dto.contact) existing.contact = dto.contact;
      await existing.save();
      await EmailVerificationService.issueCode(existing);
      return pendingVerification(existing.email);
    }

    try {
      // The User model's beforeSave hook hashes any plain value assigned to
      // `passwordHash`, so we pass the raw password through that field.
      const user = await User.create({
        name: dto.name,
        email,
        contact: dto.contact as string,
        passwordHash: dto.password,
        role: Role.BASIC,
        emailVerified: false,
      });

      await EmailVerificationService.issueCode(user);

      return pendingVerification(user.email);
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw new BadRequestError(
          'An account with this email or contact already exists',
        );
      }
      throw error;
    }
  },

  /**
   * Confirms a registration by validating the emailed code. On success the
   * account is marked verified, any pending group invitations are linked, and a
   * session (access/refresh tokens) is finally issued.
   */
  async verifyEmail(dto: VerifyEmailDTO): Promise<AuthResponseDTO> {
    const user = await User.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user) {
      throw new BadRequestError(
        'No pending verification found for this email.',
      );
    }

    if (user.emailVerified) {
      throw new BadRequestError(
        'This email is already verified. Please sign in.',
      );
    }

    await EmailVerificationService.verifyCode(user, dto.code);

    await linkPendingInvitations(user);

    return issueAuthResponse(user);
  },

  /**
   * Re-sends a verification code. Always resolves with a generic pending
   * response so it never reveals whether an (unverified) account exists for the
   * given email; a code is only actually sent when one does.
   */
  async resendVerification(
    dto: ResendVerificationDTO,
  ): Promise<PendingVerificationDTO> {
    const email = dto.email.toLowerCase();
    const user = await User.findOne({ where: { email } });

    if (user && !user.emailVerified) {
      await EmailVerificationService.issueCode(user);
    }

    return pendingVerification(email);
  },

  async login(dto: LoginDTO): Promise<AuthResponseDTO> {
    const user = await User.findOne({ where: { email: dto.email.toLowerCase() } });
    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    const valid = await user.comparePassword(dto.password);
    if (!valid) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Password is correct but the email was never confirmed: send a fresh code
    // and steer the client to the verification screen via the dedicated code.
    if (!user.emailVerified) {
      await EmailVerificationService.issueCode(user);
      throw new EmailNotVerifiedError(
        'Please verify your email. We sent you a new code.',
      );
    }

    return issueAuthResponse(user);
  },

  /**
   * Exchanges a Google ID token for our own tokens. Recognises a returning
   * Google user by their stable `sub`, links Google to a pre-existing
   * email/password account on first use, or provisions a new account.
   */
  async googleLogin(dto: GoogleLoginDTO): Promise<AuthResponseDTO> {
    const profile = await verifyGoogleIdToken(dto.idToken);

    if (!profile.emailVerified) {
      throw new AuthenticationError('Google account email is not verified');
    }

    const email = profile.email.toLowerCase();

    // 1. Returning Google user.
    let user = await User.findOne({ where: { googleId: profile.sub } });

    // 2. Existing local account with the same (verified) email — link it.
    if (!user) {
      user = await User.findOne({ where: { email } });
      if (user) {
        user.googleId = profile.sub;
        // Google has asserted ownership of this email, so a previously
        // unverified local account is now effectively verified.
        user.emailVerified = true;
        await user.save();
      }
    }

    // 3. Brand-new account.
    if (!user) {
      try {
        user = await User.create({
          name: profile.name ?? email.split('@')[0],
          email,
          googleId: profile.sub,
          role: Role.BASIC,
          // Provisioned from a Google-verified email — no code needed.
          emailVerified: true,
        });
      } catch (error) {
        if (error instanceof UniqueConstraintError) {
          // Race: the account was created between our lookups. Re-fetch it.
          user = await User.findOne({ where: { email } });
        }
        if (!user) throw error;
      }
      await linkPendingInvitations(user);
    }

    return issueAuthResponse(user);
  },

  /** Rotates a refresh token, returning a fresh access/refresh pair. */
  async refresh(refreshToken: string): Promise<AuthResponseDTO> {
    const { user, tokens } = await TokenService.rotateTokens(refreshToken);
    return mapToClass(
      {
        user: mapToClass(user, UserDTO),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
      AuthResponseDTO,
    );
  },

  /** Revokes a refresh token on logout. */
  async logout(refreshToken: string): Promise<void> {
    await TokenService.revokeToken(refreshToken);
  },

  async me(userId: string): Promise<UserDTO> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return mapToClass(user, UserDTO);
  },
};

export default AuthService;
