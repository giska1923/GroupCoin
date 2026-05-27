import { IsString, IsEmail, IsOptional, IsNotEmpty } from 'class-validator';
import { IsValidPhoneNumber } from '../../utils/validation/custom-validation';

export class BaseUserDTO {
  @IsString()
  @IsOptional()
  name!: string;

  @IsOptional()
  @IsValidPhoneNumber({
    message:
      'Contact must be a valid phone number, starting with a "+" and followed by digits',
  })
  contact?: string;
}

export class CreateUserDTO extends BaseUserDTO {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class UpdateUserDTO extends BaseUserDTO {
  @IsEmail()
  @IsOptional()
  email?: string;
}
