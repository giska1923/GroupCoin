import { Expose, Type } from 'class-transformer';
import { UserDTO } from './user.dto';

export class AuthResponseDTO {
  @Expose()
  @Type(() => UserDTO)
  user!: UserDTO;

  @Expose() token!: string;
}
