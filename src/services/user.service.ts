import { Role } from '../constants';
import { CreateUserDTO } from '../dtos/request';
import { UserDTO } from '../dtos/response';
import User from '../models/user';
import { mapToClass } from '../utils/validation/class-mapper';

const UserService = {
  async getAllUsers() {
    const users = await User.findAll();
    console.log(users[0].createdAt);
    return users;
  },

  async getUserById(id: string): Promise<UserDTO | null> {
    const user = await User.findOne({ where: { id } });
    return user as unknown as UserDTO;
  },

  async createUser(createUserDto: CreateUserDTO): Promise<UserDTO> {
    const { password, ...rest } = createUserDto;
    // The User model's beforeSave hook hashes any plain value assigned to
    // `passwordHash`, so we pass the raw password through that field.
    const user = User.build({
      ...rest,
      passwordHash: password,
      role: Role.BASIC,
    });
    const savedUser = await user.save();

    return mapToClass(savedUser, UserDTO);
  },

  async updateUser(id: string, userObject: CreateUserDTO) {
    await User.update(userObject, { where: { id } });
  },
};

export default UserService;
