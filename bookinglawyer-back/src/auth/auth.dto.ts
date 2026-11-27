import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { NewClientAccountProfile } from '../services/clients.service.js';

export class SignInDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}

export class ConfirmEmailDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{43}$/, {
    message: 'Le lien de confirmation est incomplet. Ouvrez le lien depuis le message ou demandez un nouveau lien.',
  })
  token!: string;
}

export class ResendVerificationEmailDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;
}

export class SignUpDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;
}

export class RegisterLawyerDto extends ResendVerificationEmailDto {}

export class ChangeTemporaryPasswordDto extends SignInDto {
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  newPassword!: string;
}

export class RegisterClientDto
  extends SignUpDto
  implements NewClientAccountProfile
{
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  firstName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  lastName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  country!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  city!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(32)
  phone!: string;
}
