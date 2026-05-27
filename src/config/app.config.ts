import AppConfig from '../interfaces/app-config.interface';
import dotenv from 'dotenv';

dotenv.config();

export default (): AppConfig => ({
  env: process.env.ENV,
  port: Number(process.env.PORT),
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
    // TODO: Add logging env variable and funcitonality
    logging: process.env.DB_LOGGING === 'true',
  },
});
