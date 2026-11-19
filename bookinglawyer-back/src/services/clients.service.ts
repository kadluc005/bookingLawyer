import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, asc, eq, ilike, or, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  clientProfiles,
  users,
  type NewClientProfile,
  type NewUser,
} from '../database/schema.js';
import { AuditLogsService } from './audit-logs.service.js';

export type ClientSearchQuery = {
  name?: string;
  country?: string;
  city?: string;
  email?: string;
  limit?: number;
  offset?: number;
};

export type NewClientAccountProfile = Omit<
  NewClientProfile,
  'userId' | 'createdAt' | 'updatedAt'
>;

@Injectable()
export class ClientsService {
  constructor(
    @InjectDrizzle()
    private readonly db: NodePgDatabase,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async createAccount(
    account: Pick<NewUser, 'email' | 'passwordHash'>,
    profile: NewClientAccountProfile,
  ) {
    return this.db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({ ...account, role: 'client', status: 'active' })
        .returning();
      const [clientProfile] = await tx
        .insert(clientProfiles)
        .values({ ...profile, userId: user.id })
        .returning();

      return { user, profile: clientProfile };
    });
  }

  async findProfile(userId: string) {
    const [profile] = await this.db
      .select()
      .from(clientProfiles)
      .where(eq(clientProfiles.userId, userId));

    if (!profile) {
      throw new NotFoundException('Client profile not found.');
    }

    return profile;
  }

  async updateProfile(
    userId: string,
    changes: Partial<
      Omit<NewClientProfile, 'userId' | 'createdAt' | 'updatedAt'>
    >,
  ) {
    const [profile] = await this.db
      .update(clientProfiles)
      .set({ ...changes, updatedAt: new Date() })
      .where(eq(clientProfiles.userId, userId))
      .returning();

    if (!profile) {
      throw new NotFoundException('Client profile not found.');
    }

    await this.auditLogsService.record({
      actorUserId: userId,
      action: 'client.profile.updated',
      entityType: 'client_profile',
      entityId: userId,
      metadata: { changedFields: Object.keys(changes) },
    });

    return profile;
  }

  async search(query: ClientSearchQuery = {}) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException(
        'Limit must be an integer between 1 and 100.',
      );
    }
    if (!Number.isInteger(offset) || offset < 0) {
      throw new BadRequestException('Offset must be a non-negative integer.');
    }

    const filters: SQL[] = [eq(users.role, 'client')];

    if (query.name?.trim()) {
      const name = `%${query.name.trim()}%`;
      filters.push(
        or(
          ilike(
            sql`${clientProfiles.firstName} || ' ' || ${clientProfiles.lastName}`,
            name,
          ),
          ilike(
            sql`${clientProfiles.lastName} || ' ' || ${clientProfiles.firstName}`,
            name,
          ),
        )!,
      );
    }
    if (query.country) {
      filters.push(ilike(clientProfiles.country, `%${query.country}%`));
    }
    if (query.city) {
      filters.push(ilike(clientProfiles.city, `%${query.city}%`));
    }
    if (query.email) {
      filters.push(ilike(users.email, `%${query.email}%`));
    }

    return this.db
      .select({
        userId: clientProfiles.userId,
        firstName: clientProfiles.firstName,
        lastName: clientProfiles.lastName,
        country: clientProfiles.country,
        city: clientProfiles.city,
        phone: clientProfiles.phone,
        email: users.email,
      })
      .from(clientProfiles)
      .innerJoin(users, eq(users.id, clientProfiles.userId))
      .where(and(...filters))
      .orderBy(asc(clientProfiles.lastName), asc(clientProfiles.firstName))
      .limit(limit)
      .offset(offset);
  }
}
