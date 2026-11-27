import { Policy } from '@nestjs/authorization';
import type { AuthenticatedUser } from '../services/users.service.js';

@Policy()
export class RolePolicy {
  authenticated(user: AuthenticatedUser | null) {
    return user !== null;
  }

  lawyer(user: AuthenticatedUser | null) {
    return user?.role === 'lawyer';
  }

  client(user: AuthenticatedUser | null) {
    return user?.role === 'client';
  }

  viewLawyerDirectory(user: AuthenticatedUser | null) {
    return user?.role === 'client' || user?.role === 'lawyer';
  }

  admin(user: AuthenticatedUser | null) {
    return user?.role === 'admin';
  }
}
