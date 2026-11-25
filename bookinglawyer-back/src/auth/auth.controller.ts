import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Public } from '@nestjs/authentication';
import { Throttle } from '@nestjs/throttler';
import {
  ConfirmEmailDto,
  RegisterClientDto,
  RegisterLawyerDto,
  ResendVerificationEmailDto,
  SignInDto,
} from './auth.dto.js';
import { AuthService } from './auth.service.js';
import { EmailVerificationService } from './email-verification.service.js';

@Public()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailVerification: EmailVerificationService,
  ) {}

  @Post('register/lawyer')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  registerLawyer(@Body() body: RegisterLawyerDto) {
    const { email, password, ...profile } = body;
    return this.authService.registerLawyer(email, password, profile);
  }

  @Post('register/client')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  registerClient(@Body() body: RegisterClientDto) {
    const { email, password, ...profile } = body;
    return this.authService.registerClient(email, password, profile);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async verifyEmail(@Body() body: ConfirmEmailDto) {
    await this.emailVerification.confirm(body.token);
  }

  @Post('resend-verification-email')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async resendVerificationEmail(@Body() body: ResendVerificationEmailDto) {
    await this.authService.resendVerificationEmail(body.email);
  }

  @Post('token')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  signIn(@Body() body: SignInDto) {
    return this.authService.signIn(body.email, body.password);
  }
}
