import crypto from 'crypto';
import { Op } from 'sequelize';
import config from '../config/app.config';
import { RefreshToken, User } from '../models';
import { AuthenticationError } from '../types';
import { durationToMs } from '../utils/duration';
import { signToken } from '../utils/jwt';

const { jwt: jwtConfig } = config();

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const hashToken = (raw: string): string =>
  crypto.createHash('sha256').update(raw).digest('hex');

const signAccessToken = (user: User): string =>
  signToken({ sub: user.id, email: user.email, role: user.role });

const TokenService = {
  /**
   * Issues a fresh access/refresh pair and persists the (hashed) refresh token.
   */
  async issueTokens(user: User): Promise<TokenPair> {
    const refreshToken = crypto.randomBytes(32).toString('hex');
    await RefreshToken.create({
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + durationToMs(jwtConfig.refreshExpiresIn)),
    });
    return { accessToken: signAccessToken(user), refreshToken };
  },

  /**
   * Validates a refresh token, revokes it (rotation), and issues a new pair.
   * Returns the owning user so the caller can build the auth response.
   */
  async rotateTokens(
    rawRefreshToken: string,
  ): Promise<{ user: User; tokens: TokenPair }> {
    const record = await RefreshToken.findOne({
      where: { tokenHash: hashToken(rawRefreshToken) },
    });

    if (!record || !record.isActive) {
      throw new AuthenticationError('Invalid or expired refresh token');
    }

    const user = await User.findByPk(record.userId);
    if (!user) {
      throw new AuthenticationError('Invalid or expired refresh token');
    }

    // Rotate: the old token can never be replayed once it has been exchanged.
    record.revokedAt = new Date();
    await record.save();

    const tokens = await this.issueTokens(user);
    return { user, tokens };
  },

  /**
   * Revokes a refresh token on logout. Silently ignores unknown/expired tokens
   * so logout is idempotent and never leaks whether a token existed.
   */
  async revokeToken(rawRefreshToken: string): Promise<void> {
    await RefreshToken.update(
      { revokedAt: new Date() },
      {
        where: {
          tokenHash: hashToken(rawRefreshToken),
          revokedAt: { [Op.is]: null },
        },
      },
    );
  },

  /** Revokes every active refresh token for a user (e.g. account deletion). */
  async revokeAllForUser(userId: string): Promise<void> {
    await RefreshToken.update(
      { revokedAt: new Date() },
      { where: { userId, revokedAt: { [Op.is]: null } } },
    );
  },
};

export default TokenService;
