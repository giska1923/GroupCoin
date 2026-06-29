import { Expose } from 'class-transformer';
import { RoleType } from '../../types';

export class UserDTO {
  @Expose() id!: string;
  @Expose() name!: string;
  @Expose() email!: string;
  @Expose() contact!: string;
  @Expose() role!: RoleType;
  @Expose() notificationsEnabled!: boolean;
}
