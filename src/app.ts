import express, { Request, Response, NextFunction, json } from 'express';
import morgan from 'morgan';
import cors from 'cors';
import userRoutes from './routes/user.route.js';

const app = express();

// Middlewares
app.use(json());
app.use(morgan('dev'));
app.use(cors());

// Routes
app.use('/users', userRoutes);

// Error-handling middleware
app.use((err: Error, _: any, res: Response) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

export default app;
