import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { GroupRole } from '../../constants';

export class CreateGroupDTO {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  // ISO 4217 currency code (e.g. USD, EUR).
  @IsOptional()
  @IsString()
  @Length(3, 3, { message: 'defaultCurrency must be a 3-letter ISO 4217 code' })
  defaultCurrency?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsEmail({}, { each: true })
  inviteEmails?: string[];
}

export class UpdateGroupDTO {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @Length(3, 3, { message: 'defaultCurrency must be a 3-letter ISO 4217 code' })
  defaultCurrency?: string;
}

export class AddGroupMemberDTO {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsOptional()
  @IsIn([...Object.values(GroupRole)])
  role?: (typeof GroupRole)[keyof typeof GroupRole];
}
