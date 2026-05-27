import { Request, Response } from 'express';
import UserService from '../services/user.service';
import { CreateUserDTO } from '../dtos/request/user.dto';

const UserController = {
  async getAllUsers(_req: Request, res: Response) {
    const users = await UserService.getAllUsers();
    return res.json(users);
  },

  async getUserById(req: Request, res: Response) {
    const userId = req.params.id;
    const user = await UserService.getUserById(userId);
    return res.status(201).json(user);
  },

  async createUser(req: Request, res: Response) {
    const body: CreateUserDTO = req.body;
    const user = await UserService.createUser(body);
    return res.status(201).json(user);
  },

  async updateUser(req: Request, res: Response) {
    const userId = req.params?.id;
    await UserService.updateUser(userId, req.body);
    // TODO: handle 'response sent' during error
    return res.status(201).json({ message: 'Update successful' });
  },
};

export default UserController;
