import { Request, Response } from 'express';
import InvitationService from '../services/invitation.service';
import { AuthenticationError } from '../types';

const requireUser = (req: Request) => {
  if (!req.user) {
    throw new AuthenticationError('Not authenticated');
  }
  return req.user;
};

const InvitationController = {
  async listPending(req: Request, res: Response) {
    const user = requireUser(req);
    const invitations = await InvitationService.listPendingForUser(
      user.id,
      user.email,
    );
    return res.status(200).json(invitations);
  },

  async accept(req: Request, res: Response) {
    const user = requireUser(req);
    const member = await InvitationService.acceptInvitation(
      user.id,
      user.email,
      req.params.id,
    );
    return res.status(200).json(member);
  },

  async decline(req: Request, res: Response) {
    const user = requireUser(req);
    await InvitationService.declineInvitation(
      user.id,
      user.email,
      req.params.id,
    );
    return res.status(204).send();
  },

  async listGroupInvitations(req: Request, res: Response) {
    const user = requireUser(req);
    const invitations = await InvitationService.listGroupInvitations(
      user.id,
      req.params.id,
    );
    return res.status(200).json(invitations);
  },

  async revoke(req: Request, res: Response) {
    const user = requireUser(req);
    await InvitationService.revokeInvitation(
      user.id,
      req.params.id,
      req.params.invitationId,
    );
    return res.status(204).send();
  },
};

export default InvitationController;
