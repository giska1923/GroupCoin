import { Response } from 'express';

const UserController = {
  getAllUsers(_: any, res: Response) {
    res.json({ message: 'User successfully retrieved' });
  },
};

export default UserController;
