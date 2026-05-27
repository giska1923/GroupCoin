import { RoleType } from '../../types';

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  contact: string;
  role: RoleType;
  createdAt: Date;
}
