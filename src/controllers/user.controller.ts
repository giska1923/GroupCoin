import { Request, Response } from 'express';

const UserController = {
  getAllUsers(_req: Request, res: Response) {
    res.json({ message: 'User successfully retrieved' });
  },
};

export default UserController;
