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
  port: Number(process.env.PORT),
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
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
});
