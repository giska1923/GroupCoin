import { randomBytes } from 'crypto';
import sequelize from '../config/db.config';
import { UpdateUserDTO } from '../dtos/request';
import { UserDTO } from '../dtos/response';
import { Feedback, Group, GroupInvitation, GroupMember, User } from '../models';
import { ForbiddenError, NotFoundError } from '../types';
import { mapToClass } from '../utils/validation/class-mapper';

const UserService = {
  async getAllUsers(): Promise<UserDTO[]> {
    const users = await User.findAll();
    return users.map(user => mapToClass(user, UserDTO));
  },

  async getUserById(id: string): Promise<UserDTO> {
    const user = await User.findByPk(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return mapToClass(user, UserDTO);
  },

  async updateUser(id: string, dto: UpdateUserDTO): Promise<UserDTO> {
    const user = await User.findByPk(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    await user.update(dto);
    return mapToClass(user, UserDTO);
  },

  async deleteAccount(userId: string): Promise<void> {
    await sequelize.transaction(async transaction => {
      const user = await User.findByPk(userId, { transaction });
      if (!user) {
        throw new NotFoundError('User not found');
      }

      const ownedGroupCount = await Group.count({
        where: { ownerId: userId },
        transaction,
      });
      if (ownedGroupCount > 0) {
        throw new ForbiddenError(
          'You own one or more groups. Transfer ownership or delete them before removing your account.',
        );
      }

      await GroupMember.destroy({ where: { userId }, transaction });

      await GroupInvitation.update(
        { inviteeUserId: null },
        { where: { inviteeUserId: userId }, transaction },
      );

      await Feedback.destroy({ where: { userId }, transaction });

      // Anonymize rather than hard-delete so expense, settlement, and activity
      // history in shared groups stays intact.
      await user.update(
        {
          name: 'Deleted User',
          email: `deleted-${user.id}@deleted.local`,
          contact: `deleted-${user.id}`,
          passwordHash: randomBytes(32).toString('hex'),
        },
        { transaction },
      );
    });
  },
};

export default UserService;
