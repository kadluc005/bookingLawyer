import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { NewClientAccountProfile } from '../services/clients.service.js';
import type { NewLawyerAccountProfile } from '../services/lawyers.service.js';

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

export class RegisterLawyerDto
  extends SignUpDto
  implements NewLawyerAccountProfile
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

  @IsIn(['criminal_law', 'civil_law', 'arbitration', 'cybercrime'])
  specialty!: NewLawyerAccountProfile['specialty'];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  officeCountry?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  officeCity?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  officeStreet?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  officeNumber?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50000)
  cvText?: string | null;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  websiteUrl?: string | null;
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
