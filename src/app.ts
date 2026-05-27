import express, { Request, Response, json } from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { userRoutes, healthRoute } from './routes';
import sequelize from './config/db.config';

const app = express();

sequelize
  .sync({ alter: true })
  .then(() => {
    console.log('Database & tables created!');
  })
  .catch(error => console.error('Unable to create tables:', error));

// Middlewares
app.use(json());
app.use(morgan('dev'));
app.use(cors());

// Routes
app.use('/users', userRoutes);
app.use('/health', healthRoute);

// Error-handling middleware
app.use((err: Error, _req: Request, res: Response) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

export default app;
