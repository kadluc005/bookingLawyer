import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, eq, gt, sql } from 'drizzle-orm';
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

  async createLawyerLogin(email: string, passwordHash: string, expiresAt: Date) {
    const [user] = await this.db.insert(users)
      .values({
        email,
        passwordHash,
        role: 'lawyer',
        temporaryPasswordExpiresAt: expiresAt,
      })
      .onConflictDoNothing()
      .returning({ id: users.id });
    return user;
  }

  async rotateTemporaryPassword(account: User, passwordHash: string, expiresAt: Date) {
    const [user] = await this.db.update(users)
      .set({ passwordHash, temporaryPasswordExpiresAt: expiresAt, updatedAt: new Date() })
      .where(currentTemporaryPassword(account))
      .returning({ id: users.id });
    return user;
  }

  async completeTemporaryLogin(account: User, passwordHash: string) {
    const now = new Date();
    const [user] = await this.db.update(users)
      .set({
        passwordHash,
        temporaryPasswordExpiresAt: null,
        status: 'active',
        emailVerifiedAt: now,
        updatedAt: now,
      })
      .where(and(currentTemporaryPassword(account), gt(users.temporaryPasswordExpiresAt, now)))
      .returning({ id: users.id });
    return user;
  }

  async activeAdminEmails(): Promise<string[]> {
    const admins = await this.db
      .select({ email: users.email })
      .from(users)
      .where(and(eq(users.role, 'admin'), eq(users.status, 'active')));
    return admins.map((admin) => admin.email);
  }

  async expireTemporaryPassword(id: string, passwordHash: string) {
    await this.db.update(users)
      .set({ temporaryPasswordExpiresAt: new Date(0) })
      .where(and(eq(users.id, id), eq(users.passwordHash, passwordHash), eq(users.status, 'pending_email_verification')));
  }
}

function currentTemporaryPassword(account: User) {
  return and(
    eq(users.id, account.id),
    eq(users.role, 'lawyer'),
    eq(users.status, 'pending_email_verification'),
    eq(users.passwordHash, account.passwordHash),
  );
}
