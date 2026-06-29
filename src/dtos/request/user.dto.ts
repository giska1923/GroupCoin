import { IsBoolean, IsString, IsEmail, IsOptional } from 'class-validator';
import { IsValidPhoneNumber } from '../../utils/validation/custom-validation';

export class UpdateUserDTO {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsOptional()
  @IsValidPhoneNumber({
    message:
      'Contact must be a valid phone number, starting with a "+" and followed by digits',
  })
  contact?: string;

  @IsBoolean()
  @IsOptional()
  notificationsEnabled?: boolean;
}
