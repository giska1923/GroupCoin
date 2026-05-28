import { Request, Response } from 'express';
import { CreateSettlementDTO } from '../dtos/request';
import SettlementService from '../services/settlement.service';
import { AuthenticationError } from '../types';

const requireUser = (req: Request) => {
  if (!req.user) {
    throw new AuthenticationError('Not authenticated');
  }
  return req.user;
};

const SettlementController = {
  async createSettlement(req: Request, res: Response) {
    const user = requireUser(req);
    const body: CreateSettlementDTO = req.body;
    const result = await SettlementService.createSettlement(
      user.id,
      req.params.id,
      body,
    );
    return res.status(201).json(result);
  },

  async listGroupSettlements(req: Request, res: Response) {
    const user = requireUser(req);
    const result = await SettlementService.listGroupSettlements(
      user.id,
      req.params.id,
    );
    return res.status(200).json(result);
  },

  async getSettlement(req: Request, res: Response) {
    const user = requireUser(req);
    const result = await SettlementService.getSettlement(user.id, req.params.id);
    return res.status(200).json(result);
  },

  async deleteSettlement(req: Request, res: Response) {
    const user = requireUser(req);
    await SettlementService.deleteSettlement(user.id, req.params.id);
    return res.status(204).send();
  },
};

export default SettlementController;
