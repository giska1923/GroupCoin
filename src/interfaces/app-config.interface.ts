interface DbConfig {
  url: string | undefined;
  host: string | undefined;
  port: number;
  username: string | undefined;
  password: string | undefined;
  name: string | undefined;
  logging?: boolean | undefined;
  ssl: boolean;
}

interface JwtConfig {
  secret: string;
  /** Lifetime of the short-lived access token (e.g. "15m"). */
  accessExpiresIn: string;
  /** Lifetime of the refresh token (e.g. "30d"). Drives the DB expiry. */
  refreshExpiresIn: string;
}

interface GoogleConfig {
  /**
   * Accepted OAuth client IDs (audiences) for Google ID tokens. The mobile
   * app's iOS/Android/Web client IDs all belong here so a token minted for
   * any of them verifies successfully.
   */
  clientIds: string[];
}

interface ExpoConfig {
  /**
   * Optional Expo access token. Only required if "Enhanced Security for Push
   * Notifications" is enabled on the Expo account; otherwise sends are
   * unauthenticated and this stays undefined.
   */
  accessToken: string | undefined;
}

interface EmailConfig {
  /**
   * SMTP host. When unset, the EmailService runs in "console" mode and logs
   * the message instead of sending it — handy for local dev without an SMTP
   * account. Set host/user/pass to send real mail in staging/production.
   */
  host: string | undefined;
  port: number;
  /** Whether the SMTP connection uses implicit TLS (true for port 465). */
  secure: boolean;
  user: string | undefined;
  pass: string | undefined;
  /** The From address shown to recipients, e.g. "GroupCoin <no-reply@…>". */
  from: string;
}

interface VerificationConfig {
  /** Number of digits in the emailed code. */
  codeLength: number;
  /** How long a code stays valid (e.g. "15m") before the user must resend. */
  ttl: string;
  /** Max wrong guesses against a single code before it is locked. */
  maxAttempts: number;
}

interface AppConfig {
  env: string | undefined;
  port: number;
  db: DbConfig;
  jwt: JwtConfig;
  google: GoogleConfig;
  expo: ExpoConfig;
  email: EmailConfig;
  verification: VerificationConfig;
}

export default AppConfig;
