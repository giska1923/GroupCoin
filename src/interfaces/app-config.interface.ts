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

interface AppConfig {
  env: string | undefined;
  port: number;
  db: DbConfig;
  jwt: JwtConfig;
  google: GoogleConfig;
}

export default AppConfig;
