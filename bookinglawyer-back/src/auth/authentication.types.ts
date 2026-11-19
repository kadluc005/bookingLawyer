import type { AuthenticatedUser } from '../services/users.service.js';

declare module '@nestjs/authentication' {
  interface AuthenticationTypes {
    user: AuthenticatedUser;
    refreshTokens: false;
  }
}
