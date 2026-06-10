// import pkg from 'pg';
// const { Client } = pkg;
// import config from './app.config';

// const appConfig = config();

// const db = new Client({
//   user: appConfig.db.username,
//   host: appConfig.db.host,
//   database: appConfig.db.name,
//   password: appConfig.db.password,
//   port: Number(appConfig.db.port),
// });

// db.connect()
//   .then(() => logger.log('Connected to PostgreSQL'))
//   .catch(err => console.error('Connection error', err.stack));

// export default db;

import { Sequelize } from 'sequelize-typescript';
import config from './app.config';
import {
  Activity,
  Expense,
  ExpenseSplit,
  Group,
  GroupInvitation,
  GroupMember,
  Settlement,
  User,
} from '../models';
import AppLogger from '../utils/logger';

const appConfig = config();
const logger = new AppLogger('DB');

const sequelize = new Sequelize({
  database: appConfig.db.name,
  dialect: 'postgres',
  host: appConfig.db.host,
  port: appConfig.db.port,
  username: appConfig.db.username,
  password: appConfig.db.password,
  logging: false,
  define: {
    timestamps: true,
  },
});
sequelize.addModels([
  User,
  Group,
  GroupMember,
  Expense,
  ExpenseSplit,
  Settlement,
  Activity,
  GroupInvitation,
]);

sequelize
  .authenticate()
  .then(() =>
    logger.log('Database connection has been established successfully.'),
  )
  .catch((error: unknown) =>
    logger.error(
      `Unable to connect to the database: ${(error as Error).message}`,
    ),
  );

export default sequelize;
