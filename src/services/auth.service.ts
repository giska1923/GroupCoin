import { UniqueConstraintError } from 'sequelize';
import { Role } from '../constants';
import { LoginDTO, RegisterDTO } from '../dtos/request';
import { AuthResponseDTO, UserDTO } from '../dtos/response';
import { User } from '../models';
import { AuthenticationError, BadRequestError, NotFoundError } from '../types';
import { signToken } from '../utils/jwt';
import { mapToClass } from '../utils/validation/class-mapper';

const issueAuthResponse = (user: User): AuthResponseDTO => {
  const token = signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });
  return mapToClass({ user: mapToClass(user, UserDTO), token }, AuthResponseDTO);
};

const AuthService = {
  async register(dto: RegisterDTO): Promise<AuthResponseDTO> {
    try {
      // The User model's beforeSave hook hashes any plain value assigned to
      // `passwordHash`, so we pass the raw password through that field.
      const user = await User.create({
        name: dto.name,
        email: dto.email,
        contact: dto.contact as string,
        passwordHash: dto.password,
        role: Role.BASIC,
      });
      return issueAuthResponse(user);
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw new BadRequestError(
          'An account with this email or contact already exists',
        );
      }
      throw error;
    }
  },

  async login(dto: LoginDTO): Promise<AuthResponseDTO> {
    const user = await User.findOne({ where: { email: dto.email.toLowerCase() } });
    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    const valid = await user.comparePassword(dto.password);
    if (!valid) {
      throw new AuthenticationError('Invalid email or password');
    }

    return issueAuthResponse(user);
  },

  async me(userId: string): Promise<UserDTO> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return mapToClass(user, UserDTO);
  },
};

export default AuthService;
