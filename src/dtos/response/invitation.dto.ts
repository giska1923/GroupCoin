import { Expose, Type } from 'class-transformer';
import { GroupRoleType, InvitationStatusType } from '../../types';
import { GroupDTO } from './group.dto';
import { UserDTO } from './user.dto';

export class InvitationDTO {
  @Expose() id!: string;
  @Expose() groupId!: string;
  @Expose() inviterId!: string;
  @Expose() inviteeEmail!: string;
  @Expose() inviteeUserId!: string | null;
  @Expose() role!: GroupRoleType;
  @Expose() status!: InvitationStatusType;
  @Expose() expiresAt!: Date;
  @Expose() createdAt!: Date;

  @Expose()
  @Type(() => GroupDTO)
  group?: GroupDTO;

  @Expose()
  @Type(() => UserDTO)
  inviter?: UserDTO;
}
