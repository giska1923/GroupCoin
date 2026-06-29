import { Request, Response } from 'express';
import {
  GoogleLoginDTO,
  LoginDTO,
  RefreshTokenDTO,
  RegisterDTO,
  RegisterDeviceTokenDTO,
  RemoveDeviceTokenDTO,
  ResendVerificationDTO,
  VerifyEmailDTO,
} from '../dtos/request';
import AuthService from '../services/auth.service';
import DeviceTokenService from '../services/device-token.service';
import UserService from '../services/user.service';
import { AuthenticationError } from '../types';

const AuthController = {
  async register(req: Request, res: Response) {
    const body: RegisterDTO = req.body;
    const result = await AuthService.register(body);
    // 202 Accepted: the account is pending email verification, not yet active.
    return res.status(202).json(result);
  },

  async verifyEmail(req: Request, res: Response) {
    const body: VerifyEmailDTO = req.body;
    const result = await AuthService.verifyEmail(body);
    return res.status(200).json(result);
  },

  async resendVerification(req: Request, res: Response) {
    const body: ResendVerificationDTO = req.body;
    const result = await AuthService.resendVerification(body);
    return res.status(200).json(result);
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

  async registerDeviceToken(req: Request, res: Response) {
    if (!req.user) {
      throw new AuthenticationError('Not authenticated');
    }
    const body: RegisterDeviceTokenDTO = req.body;
    const result = await DeviceTokenService.registerToken(req.user.id, body);
    return res.status(201).json(result);
  },

  async removeDeviceToken(req: Request, res: Response) {
    if (!req.user) {
      throw new AuthenticationError('Not authenticated');
    }
    const body: RemoveDeviceTokenDTO = req.body;
    await DeviceTokenService.removeToken(req.user.id, body.token);
    return res.status(204).send();
  },
};

export default AuthController;
