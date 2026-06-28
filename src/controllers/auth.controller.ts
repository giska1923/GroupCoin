import { Request, Response } from 'express';
import {
  GoogleLoginDTO,
  LoginDTO,
  RefreshTokenDTO,
  RegisterDTO,
} from '../dtos/request';
import AuthService from '../services/auth.service';
import UserService from '../services/user.service';
import { AuthenticationError } from '../types';

const AuthController = {
  async register(req: Request, res: Response) {
    const body: RegisterDTO = req.body;
    const result = await AuthService.register(body);
    return res.status(201).json(result);
  },

  async login(req: Request, res: Response) {
    const body: LoginDTO = req.body;
    const result = await AuthService.login(body);
    return res.status(200).json(result);
  },

  async google(req: Request, res: Response) {
    const body: GoogleLoginDTO = req.body;
    const result = await AuthService.googleLogin(body);
    return res.status(200).json(result);
  },

  async refresh(req: Request, res: Response) {
    const body: RefreshTokenDTO = req.body;
    const result = await AuthService.refresh(body.refreshToken);
    return res.status(200).json(result);
  },

  async logout(req: Request, res: Response) {
    const body: RefreshTokenDTO = req.body;
    await AuthService.logout(body.refreshToken);
    return res.status(204).send();
  },

  async me(req: Request, res: Response) {
    if (!req.user) {
      throw new AuthenticationError('Not authenticated');
    }
    const user = await AuthService.me(req.user.id);
    return res.status(200).json(user);
  },

  async deleteAccount(req: Request, res: Response) {
    if (!req.user) {
      throw new AuthenticationError('Not authenticated');
    }
    await UserService.deleteAccount(req.user.id);
    return res.status(204).send();
  },
};

export default AuthController;
