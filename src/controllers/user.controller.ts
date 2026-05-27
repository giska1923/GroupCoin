import { Request, Response } from 'express';
import UserService from '../services/user.service';
import { UpdateUserDTO } from '../dtos/request';

const UserController = {
  async getAllUsers(_req: Request, res: Response) {
    const users = await UserService.getAllUsers();
    return res.status(200).json(users);
  },

  async getUserById(req: Request, res: Response) {
    const user = await UserService.getUserById(req.params.id);
    return res.status(200).json(user);
  },

  async updateUser(req: Request, res: Response) {
    const body: UpdateUserDTO = req.body;
    const updated = await UserService.updateUser(req.params.id, body);
    return res.status(200).json(updated);
  },
};

export default UserController;
