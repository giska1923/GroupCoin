import { UpdateUserDTO } from '../dtos/request';
import { UserDTO } from '../dtos/response';
import { User } from '../models';
import { NotFoundError } from '../types';
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
};

export default UserService;
