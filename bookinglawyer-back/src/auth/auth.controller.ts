import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Public } from '@nestjs/authentication';
import { Throttle } from '@nestjs/throttler';
import { RegisterClientDto, RegisterLawyerDto, SignInDto } from './auth.dto.js';
import { AuthService } from './auth.service.js';

@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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

  @Post('token')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  signIn(@Body() body: SignInDto) {
    return this.authService.signIn(body.email, body.password);
  }
}
