import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { users, type User } from '../database/schema.js';

export type AuthenticatedUser = Pick<
  User,
  'id' | 'email' | 'role' | 'status' | 'emailVerifiedAt'
>;

@Injectable()
export class UsersService {
  constructor(
    @InjectDrizzle()
    private readonly db: NodePgDatabase,
  ) {}

  async findById(id: string): Promise<AuthenticatedUser | undefined> {
    const [user] = await this.db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        status: users.status,
        emailVerifiedAt: users.emailVerifiedAt,
      })
      .from(users)
      .where(eq(users.id, id));
    return user;
  }

  async findByEmail(email: string): Promise<AuthenticatedUser | undefined> {
    const [user] = await this.db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        status: users.status,
        emailVerifiedAt: users.emailVerifiedAt,
      })
      .from(users)
      .where(sql`lower(${users.email}) = lower(${email})`);
    return user;
  }

  async findCredentialsByEmail(email: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = lower(${email})`);

    return user;
  }

  async updatePasswordHash(id: string, passwordHash: string) {
    await this.db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, id));
  }
}
