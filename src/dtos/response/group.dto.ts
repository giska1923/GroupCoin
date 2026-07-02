import { Expose, Type } from 'class-transformer';
import { GroupRoleType, GroupStatusType } from '../../types';
import { UserDTO } from './user.dto';

export class GroupDTO {
  @Expose() id!: string;
  @Expose() name!: string;
  @Expose() description!: string | null;
  @Expose() defaultCurrency!: string;
  @Expose() imageUrl!: string | null;
  @Expose() ownerId!: string;
  @Expose() status!: GroupStatusType;
  @Expose() createdAt!: Date;
  @Expose() updatedAt!: Date;

  // Only populated on list endpoints that aggregate membership.
  @Expose() memberCount?: number;
}

export class GroupMemberDTO {
  @Expose() id!: string;
  @Expose() groupId!: string;
  @Expose() userId!: string;
  @Expose() role!: GroupRoleType;
  @Expose() createdAt!: Date;

  @Expose()
  @Type(() => UserDTO)
  user?: UserDTO;
}

export class GroupDetailDTO {
  @Expose()
  @Type(() => GroupDTO)
  group!: GroupDTO;

  @Expose()
  @Type(() => GroupMemberDTO)
  members!: GroupMemberDTO[];
}
