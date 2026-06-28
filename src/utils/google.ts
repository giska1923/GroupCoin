import { OAuth2Client } from 'google-auth-library';
import config from '../config/app.config';
import { AuthenticationError } from '../types';

const { google: googleConfig } = config();

// A single shared client; verification only needs the accepted audiences.
const client = new OAuth2Client();

export interface GoogleProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
}

/**
 * Verifies a Google OpenID Connect ID token: checks the signature against
 * Google's public keys, that it has not expired, and that its audience is one
 * of our configured OAuth client IDs. Returns the trusted profile claims.
 */
export async function verifyGoogleIdToken(
  idToken: string,
): Promise<GoogleProfile> {
  if (googleConfig.clientIds.length === 0) {
    throw new Error(
      'GOOGLE_CLIENT_IDS is not configured; Google sign-in is unavailable.',
    );
  }

  let payload;
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: googleConfig.clientIds,
    });
    payload = ticket.getPayload();
  } catch {
    throw new AuthenticationError('Invalid Google token');
  }

  if (!payload || !payload.sub || !payload.email) {
    throw new AuthenticationError('Invalid Google token');
  }

  return {
    sub: payload.sub,
    email: payload.email,
    emailVerified: payload.email_verified === true,
    name: payload.name ?? null,
    picture: payload.picture ?? null,
  };
}
