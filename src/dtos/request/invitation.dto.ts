import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { GroupRole } from '../../constants';

export class CreateInvitationDTO {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsOptional()
  @IsIn([...Object.values(GroupRole)])
  role?: (typeof GroupRole)[keyof typeof GroupRole];
}

export class InvitationIdParamDTO {
  @IsUUID(4)
  id!: string;
}
