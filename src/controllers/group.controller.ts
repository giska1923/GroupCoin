import { Request, Response } from 'express';
import {
  AddGroupMemberDTO,
  CreateGroupDTO,
  UpdateGroupDTO,
} from '../dtos/request';
import ActivityService from '../services/activity.service';
import GroupService from '../services/group.service';
import { AuthenticationError } from '../types';

const requireUser = (req: Request) => {
  if (!req.user) {
    throw new AuthenticationError('Not authenticated');
  }
  return req.user;
};

const GroupController = {
  async createGroup(req: Request, res: Response) {
    const user = requireUser(req);
    const body: CreateGroupDTO = req.body;
    const result = await GroupService.createGroup(user.id, body);
    return res.status(201).json(result);
  },

  async listGroups(req: Request, res: Response) {
    const user = requireUser(req);
    const groups = await GroupService.listGroupsForUser(user.id);
    return res.status(200).json(groups);
  },

  async getGroup(req: Request, res: Response) {
    const user = requireUser(req);
    const result = await GroupService.getGroupDetail(user.id, req.params.id);
    return res.status(200).json(result);
  },

  async updateGroup(req: Request, res: Response) {
    const user = requireUser(req);
    const body: UpdateGroupDTO = req.body;
    const updated = await GroupService.updateGroup(user.id, req.params.id, body);
    return res.status(200).json(updated);
  },

  async deleteGroup(req: Request, res: Response) {
    const user = requireUser(req);
    await GroupService.deleteGroup(user.id, req.params.id);
    return res.status(204).send();
  },

  async listMembers(req: Request, res: Response) {
    const user = requireUser(req);
    const members = await GroupService.listMembers(user.id, req.params.id);
    return res.status(200).json(members);
  },

  async addMember(req: Request, res: Response) {
    const user = requireUser(req);
    const body: AddGroupMemberDTO = req.body;
    const member = await GroupService.addMember(user.id, req.params.id, body);
    return res.status(201).json(member);
  },

  async removeMember(req: Request, res: Response) {
    const user = requireUser(req);
    await GroupService.removeMember(
      user.id,
      req.params.id,
      req.params.userId,
    );
    return res.status(204).send();
  },

  async listActivity(req: Request, res: Response) {
    const user = requireUser(req);
    const limit =
      req.query.limit !== undefined ? Number(req.query.limit) : undefined;
    const offset =
      req.query.offset !== undefined ? Number(req.query.offset) : undefined;
    const result = await ActivityService.listGroupActivity({
      actorId: user.id,
      groupId: req.params.id,
      limit,
      offset,
    });
    return res.status(200).json(result);
  },
};

export default GroupController;
