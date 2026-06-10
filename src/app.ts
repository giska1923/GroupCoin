import express, { json } from 'express';
import morgan from 'morgan';
import cors from 'cors';
import {
  userRoutes,
  healthRoute,
  authRoutes,
  groupRoutes,
  expenseRoutes,
  invitationRoutes,
  settlementRoutes,
} from './routes';
import sequelize from './config/db.config';
import { rateLimiter } from './middlewares/rate-limit.middleware';

import { NotFoundError } from './types/error';
import { errorHandler } from './middlewares/error-handle.middleware';
import AppLogger from './utils/logger';

const app = express();
const logger = new AppLogger('App');

// Middlewares
app.use(json());
app.use(morgan('combined')); // Morgan for Request logging
app.use(cors());
app.use(rateLimiter);

(async () => {
  try {
    await sequelize.sync({ alter: true }); // alter | force
    logger.log('Database & tables created!');
  } catch (error: unknown) {
    logger.error((error as Error).message);
    throw error;
  }
})();

// Routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/groups', groupRoutes);
app.use('/expenses', expenseRoutes);
app.use('/invitations', invitationRoutes);
app.use('/settlements', settlementRoutes);
app.use('/health', healthRoute);

// Catch-all for unmatched routes
app.use('*', () => {
  throw new NotFoundError('Not found!');
});

app.use(errorHandler); // Global error handler

export default app;
