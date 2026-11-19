import { Injectable } from '@nestjs/common';
import {
  AuthenticationRegistry,
  JwtBearerProvider,
  type JwtClaims,
} from '@nestjs/authentication';
import { UsersService } from '../services/users.service.js';
import type { AuthenticatedUser } from '../services/users.service.js';

@Injectable()
export class JwtAuthProvider extends JwtBearerProvider<AuthenticatedUser> {
  constructor(
    private readonly usersService: UsersService,
    registry: AuthenticationRegistry,
  ) {
    super({ realm: 'bookinglawyer' });
    registry.registerProvider(this);
  }

  async validate(claims: JwtClaims) {
    if (!claims.sub) {
      return null;
    }

    const user = await this.usersService.findById(claims.sub);
    return user?.status === 'suspended' ? null : (user ?? null);
  }
}
