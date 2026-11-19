import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, desc, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { auditLogs } from '../database/schema.js';

export type NewAuditLog = Omit<
  typeof auditLogs.$inferInsert,
  'id' | 'createdAt'
>;

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectDrizzle()
    private readonly db: NodePgDatabase,
  ) {}

  async record(entry: NewAuditLog) {
    const [log] = await this.db.insert(auditLogs).values(entry).returning();
    return log;
  }

  findForEntity(entityType: string, entityId: string, limit = 100) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException(
        'Limit must be an integer between 1 and 100.',
      );
    }

    return this.db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.entityType, entityType),
          eq(auditLogs.entityId, entityId),
        ),
      )
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }
}
