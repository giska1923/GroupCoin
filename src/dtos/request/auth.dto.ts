import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { IsValidPhoneNumber } from '../../utils/validation/custom-validation';

export class RegisterDTO {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password!: string;

  @IsOptional()
  @IsValidPhoneNumber({
    message:
      'Contact must be a valid phone number, starting with a "+" and followed by digits',
  })
  contact?: string;
}

export class LoginDTO {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class GoogleLoginDTO {
  // The Google-issued OpenID Connect ID token obtained on the client.
  @IsString()
  @IsNotEmpty()
  idToken!: string;
}

export class RefreshTokenDTO {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class VerifyEmailDTO {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  // The numeric code emailed to the user. Validated as a non-empty string so
  // leading zeros survive; the exact length/format is checked in the service.
  @IsString()
  @IsNotEmpty()
  code!: string;
}

export class ResendVerificationDTO {
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}
