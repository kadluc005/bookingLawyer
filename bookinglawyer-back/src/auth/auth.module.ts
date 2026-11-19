import { Module } from '@nestjs/common';
import './authentication.types.js';
import { ServicesModule } from '../services/services.module.js';
import { AccountController } from './account.controller.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthProvider } from './jwt-auth.provider.js';

@Module({
  imports: [ServicesModule],
  controllers: [AccountController, AuthController],
  providers: [AuthService, JwtAuthProvider],
})
export class AuthModule {}
