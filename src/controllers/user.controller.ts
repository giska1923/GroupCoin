import { Request, Response } from 'express';
import UserService from '../services/user.service';
import { CreateUserDTO } from '../dtos/create-user.dto';

const UserController = {
  async getAllUsers(_req: Request, res: Response) {
    try {
      const users = await UserService.getAllUsers();
      res.json(users);
    } catch (e) {
      console.error('Error fetching users:', e);
      res.status(500).json({ message: 'Error fetching users' });
    }
  },

  async createUser(req: Request, res: Response) {
    try {
      const body: CreateUserDTO = req.body;
      const newUser = await UserService.createUser(body);
      res.status(201).json(newUser);
    } catch (e) {
      console.error('Error creating user:', e);
      res.status(500).json({ message: 'Error creating user' });
    }
  },
};

export default UserController;
