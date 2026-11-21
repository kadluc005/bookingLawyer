import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { asc, desc, eq, max, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  clientProfiles,
  contactEvents,
  lawyerProfiles,
  users,
} from '../database/schema.js';

export type RecordContactEvent = {
  clientUserId: string;
  lawyerUserId: string;
  channel: typeof contactEvents.$inferInsert.channel;
};

@Injectable()
export class ContactEventsService {
  constructor(
    @InjectDrizzle()
    private readonly db: NodePgDatabase,
  ) {}

  async recordClick(event: RecordContactEvent) {
    const [client] = await this.db
      .select({ userId: clientProfiles.userId })
      .from(clientProfiles)
      .where(eq(clientProfiles.userId, event.clientUserId));
    if (!client) {
      throw new NotFoundException('Client profile not found.');
    }

    const [lawyer] = await this.db
      .select({ userId: lawyerProfiles.userId })
      .from(lawyerProfiles)
      .where(eq(lawyerProfiles.userId, event.lawyerUserId));
    if (!lawyer) {
      throw new NotFoundException('Lawyer profile not found.');
    }

    const [contactEvent] = await this.db
      .insert(contactEvents)
      .values(event)
      .returning();

    return contactEvent;
  }

  async findClientsForLawyer(lawyerUserId: string, limit = 20, offset = 0) {
    const lastContactAt = max(contactEvents.createdAt);
    const rows = await this.db
      .select({
        clientId: clientProfiles.userId,
        firstName: clientProfiles.firstName,
        lastName: clientProfiles.lastName,
        lastContactAt,
        emailRequests: sql`count(*) filter (where ${contactEvents.channel} = 'email')`.mapWith(Number),
        phoneRequests: sql`count(*) filter (where ${contactEvents.channel} = 'phone')`.mapWith(Number),
      })
      .from(contactEvents)
      .innerJoin(clientProfiles, eq(clientProfiles.userId, contactEvents.clientUserId))
      .where(eq(contactEvents.lawyerUserId, lawyerUserId))
      .groupBy(clientProfiles.userId, clientProfiles.firstName, clientProfiles.lastName)
      .orderBy(desc(lastContactAt), asc(clientProfiles.userId))
      .limit(limit + 1)
      .offset(offset);

    return { clients: rows.slice(0, limit), hasMore: rows.length > limit };
  }

  findForLawyer(lawyerUserId: string, limit = 100) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException(
        'Limit must be an integer between 1 and 100.',
      );
    }

    return this.db
      .select({
        id: contactEvents.id,
        channel: contactEvents.channel,
        createdAt: contactEvents.createdAt,
        clientUserId: clientProfiles.userId,
        firstName: clientProfiles.firstName,
        lastName: clientProfiles.lastName,
        country: clientProfiles.country,
        city: clientProfiles.city,
        phone: clientProfiles.phone,
        email: users.email,
      })
      .from(contactEvents)
      .innerJoin(
        clientProfiles,
        eq(clientProfiles.userId, contactEvents.clientUserId),
      )
      .innerJoin(users, eq(users.id, clientProfiles.userId))
      .where(eq(contactEvents.lawyerUserId, lawyerUserId))
      .orderBy(desc(contactEvents.createdAt))
      .limit(limit);
  }
}
