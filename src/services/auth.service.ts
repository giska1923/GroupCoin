import { UniqueConstraintError } from 'sequelize';
import { Role, InvitationStatus } from '../constants';
import { GoogleLoginDTO, LoginDTO, RegisterDTO } from '../dtos/request';
import { AuthResponseDTO, UserDTO } from '../dtos/response';
import { GroupInvitation, User } from '../models';
import { AuthenticationError, BadRequestError, NotFoundError } from '../types';
import { verifyGoogleIdToken } from '../utils/google';
import { mapToClass } from '../utils/validation/class-mapper';
import TokenService from './token.service';

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
  async register(dto: RegisterDTO): Promise<AuthResponseDTO> {
    try {
      // The User model's beforeSave hook hashes any plain value assigned to
      // `passwordHash`, so we pass the raw password through that field.
      const user = await User.create({
        name: dto.name,
        email: dto.email,
        contact: dto.contact as string,
        passwordHash: dto.password,
        role: Role.BASIC,
      });

      await linkPendingInvitations(user);

      return issueAuthResponse(user);
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw new BadRequestError(
          'An account with this email or contact already exists',
        );
      }
      throw error;
    }
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
