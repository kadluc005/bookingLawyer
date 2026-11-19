import { Controller, Get } from '@nestjs/common';
import { Can } from '@nestjs/authorization';
import { CurrentUser } from '@nestjs/authentication';
import { RolePolicy } from '../authorization/role.policy.js';
import type { AuthenticatedUser } from '../services/users.service.js';

@Controller('auth/me')
@Can(RolePolicy, 'authenticated')
export class AccountController {
  @Get()
  getCurrentAccount(@CurrentUser() user: AuthenticatedUser) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerifiedAt !== null,
    };
  }
}
