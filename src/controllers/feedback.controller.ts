import { Request, Response } from 'express';
import { CreateFeedbackDTO } from '../dtos/request';
import FeedbackService from '../services/feedback.service';
import { AuthenticationError } from '../types';

const requireUser = (req: Request) => {
  if (!req.user) {
    throw new AuthenticationError('Not authenticated');
  }
  return req.user;
};

const FeedbackController = {
  async submit(req: Request, res: Response) {
    const user = requireUser(req);
    const body: CreateFeedbackDTO = req.body;
    const result = await FeedbackService.submit(user.id, body);
    return res.status(201).json(result);
  },
};

export default FeedbackController;
