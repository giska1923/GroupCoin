import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { GroupRole, SUPPORTED_CURRENCY_CODES } from '../../constants';

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
  @IsIn(SUPPORTED_CURRENCY_CODES, {
    message: 'defaultCurrency must be a supported ISO 4217 code',
  })
  defaultCurrency?: string;

  // https URL or base64 data URI (data URIs are large, hence the generous cap).
  @IsOptional()
  @IsString()
  @MaxLength(500_000)
  imageUrl?: string;

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
  @IsIn(SUPPORTED_CURRENCY_CODES, {
    message: 'defaultCurrency must be a supported ISO 4217 code',
  })
  defaultCurrency?: string;

  // https URL or base64 data URI (data URIs are large, hence the generous cap).
  @IsOptional()
  @IsString()
  @MaxLength(500_000)
  imageUrl?: string;
}

export class AddGroupMemberDTO {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsOptional()
  @IsIn([...Object.values(GroupRole)])
  role?: (typeof GroupRole)[keyof typeof GroupRole];
}
