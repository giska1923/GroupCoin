import { Request, Response } from 'express';
import { CreateExpenseDTO, UpdateExpenseDTO } from '../dtos/request';
import BalanceService from '../services/balance.service';
import ExpenseService from '../services/expense.service';
import { AuthenticationError } from '../types';

const requireUser = (req: Request) => {
  if (!req.user) {
    throw new AuthenticationError('Not authenticated');
  }
  return req.user;
};

const ExpenseController = {
  async createExpense(req: Request, res: Response) {
    const user = requireUser(req);
    const body: CreateExpenseDTO = req.body;
    const result = await ExpenseService.createExpense(
      user.id,
      req.params.id,
      body,
    );
    return res.status(201).json(result);
  },

  async listGroupExpenses(req: Request, res: Response) {
    const user = requireUser(req);
    const result = await ExpenseService.listGroupExpenses(
      user.id,
      req.params.id,
    );
    return res.status(200).json(result);
  },

  async getExpense(req: Request, res: Response) {
    const user = requireUser(req);
    const result = await ExpenseService.getExpense(user.id, req.params.id);
    return res.status(200).json(result);
  },

  async updateExpense(req: Request, res: Response) {
    const user = requireUser(req);
    const body: UpdateExpenseDTO = req.body;
    const result = await ExpenseService.updateExpense(
      user.id,
      req.params.id,
      body,
    );
    return res.status(200).json(result);
  },

  async deleteExpense(req: Request, res: Response) {
    const user = requireUser(req);
    await ExpenseService.deleteExpense(user.id, req.params.id);
    return res.status(204).send();
  },

  async getGroupBalances(req: Request, res: Response) {
    const user = requireUser(req);
    const result = await BalanceService.getGroupBalances(
      user.id,
      req.params.id,
    );
    return res.status(200).json(result);
  },

  async getSimplifiedTransfers(req: Request, res: Response) {
    const user = requireUser(req);
    const result = await BalanceService.getSimplifiedTransfers(
      user.id,
      req.params.id,
    );
    return res.status(200).json(result);
  },
};

export default ExpenseController;
