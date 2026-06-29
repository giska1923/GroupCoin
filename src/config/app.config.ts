import AppConfig from '../interfaces/app-config.interface';
import dotenv from 'dotenv';

dotenv.config();

// Fail fast if JWT_SECRET is missing — without it auth is silently broken.
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error(
    'JWT_SECRET environment variable is required. See .env.example.',
  );
}

export default (): AppConfig => ({
  env: process.env.NODE_ENV,
  // Render injects PORT at runtime; fall back to 3000 for local dev so a
  // missing PORT never becomes `listen(NaN)`.
  port: Number(process.env.PORT) || 3000,
  db: {
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
    logging: process.env.DB_LOGGING === 'true',
    ssl: process.env.DB_SSL === 'true' || Boolean(process.env.DATABASE_URL),
  },
  jwt: {
    secret: jwtSecret,
    // Short-lived access token; the refresh token keeps sessions alive.
    // JWT_EXPIRES_IN is kept as a fallback for backwards compatibility.
    accessExpiresIn:
      process.env.JWT_ACCESS_EXPIRES_IN ?? process.env.JWT_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
  },
  google: {
    // Comma-separated list so iOS, Android and Web client IDs can all be
    // accepted as valid audiences for an incoming Google ID token.
    clientIds: (process.env.GOOGLE_CLIENT_IDS ?? '')
      .split(',')
      .map(id => id.trim())
      .filter(Boolean),
  },
  expo: {
    accessToken: process.env.EXPO_ACCESS_TOKEN || undefined,
  },
  email: {
    host: process.env.SMTP_HOST || undefined,
    port: Number(process.env.SMTP_PORT) || 587,
    // Port 465 uses implicit TLS; 587/25 use STARTTLS (secure=false).
    secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
    user: process.env.SMTP_USER || undefined,
    pass: process.env.SMTP_PASS || undefined,
    from: process.env.EMAIL_FROM || 'GroupCoin <no-reply@groupcoin.app>',
  },
  verification: {
    codeLength: Number(process.env.EMAIL_VERIFICATION_CODE_LENGTH) || 6,
    ttl: process.env.EMAIL_VERIFICATION_TTL ?? '15m',
    maxAttempts: Number(process.env.EMAIL_VERIFICATION_MAX_ATTEMPTS) || 5,
  },
});
