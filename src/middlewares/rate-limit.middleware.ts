import rateLimit from 'express-rate-limit';

const WINDOW_MS = 15 * 60 * 1000;
const NUMBER_OF_REQUESTS = 10000;

export const rateLimiter = rateLimit({
  windowMs: WINDOW_MS, // 15 minutes
  max: NUMBER_OF_REQUESTS, // Limit each IP to 10000 requests per windowMs
  message: 'Too many requests, please try again later.',
});
