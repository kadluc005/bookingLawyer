import { Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import type { NewLawyerProfile } from '../database/schema.js';
import type { LawyerDirectoryQuery } from '../services/lawyers.service.js';
import type { ClientSearchQuery } from '../services/clients.service.js';
import type { payments } from '../database/schema.js';

export class LawyerDirectoryQueryDto implements LawyerDirectoryQuery {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  officeCountry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  officeCity?: string;

  @IsOptional()
  @IsIn(['criminal_law', 'civil_law', 'arbitration', 'cybercrime'])
  specialty?: NewLawyerProfile['specialty'];

  @IsOptional()
  @IsIn(['alphabetical', 'experience'])
  sort?: 'alphabetical' | 'experience';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

export class UpdateLawyerProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  country?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  phone?: string;

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
  @IsIn(['criminal_law', 'civil_law', 'arbitration', 'cybercrime'])
  specialty?: NewLawyerProfile['specialty'];

  @IsOptional()
  @IsString()
  @MaxLength(50000)
  cvText?: string | null;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  websiteUrl?: string | null;
}

export class UpdateClientProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  country?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  phone?: string;
}

export class ClientSearchQueryDto implements ClientSearchQuery {
  @IsOptional()
  @IsString()
  @MaxLength(240)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  email?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

export class ReviewLawyerDto {
  @IsIn(['approved', 'rejected'])
  decision!: 'approved' | 'rejected';
}

export class ContactClickDto {
  @IsIn(['email', 'phone'])
  channel!: 'email' | 'phone';
}

export class PaymentMethodDto {
  @IsIn(['bank_transfer', 'paypal', 'cryptocurrency'])
  method!: typeof payments.$inferInsert.method;
}
