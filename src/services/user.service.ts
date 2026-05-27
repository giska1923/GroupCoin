import { Role } from '../constants';
import { CreateUserDTO } from '../dtos';
import User from '../models/user';

const UserService = {
  async getAllUsers() {
    try {
      const users = await User.findAll();
      return users;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  async createUser(createUserDto: CreateUserDTO) {
    try {
      const userData = { ...createUserDto, role: Role.BASIC };
      const user = User.build(userData);
      await user.save();

      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },
};

export default UserService;
