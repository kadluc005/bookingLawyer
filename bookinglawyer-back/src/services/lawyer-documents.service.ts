import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { lawyerDocuments, lawyerProfiles } from '../database/schema.js';

export type NewLawyerDocument = Omit<
  typeof lawyerDocuments.$inferInsert,
  'id' | 'createdAt'
>;

@Injectable()
export class LawyerDocumentsService {
  constructor(
    @InjectDrizzle()
    private readonly db: NodePgDatabase,
  ) {}

  async addDocument(document: NewLawyerDocument) {
    if (
      !Number.isInteger(document.documentNumber) ||
      document.documentNumber < 1 ||
      document.documentNumber > 5
    ) {
      throw new BadRequestException(
        'A lawyer can upload up to five CV documents.',
      );
    }
    if (!Number.isInteger(document.sizeBytes) || document.sizeBytes < 1) {
      throw new BadRequestException(
        'Document size must be a positive integer.',
      );
    }

    const [profile] = await this.db
      .select({ userId: lawyerProfiles.userId })
      .from(lawyerProfiles)
      .where(eq(lawyerProfiles.userId, document.lawyerUserId));

    if (!profile) {
      throw new NotFoundException('Lawyer profile not found.');
    }

    const [createdDocument] = await this.db
      .insert(lawyerDocuments)
      .values(document)
      .returning();

    return createdDocument;
  }

  findForLawyer(lawyerUserId: string) {
    return this.db
      .select()
      .from(lawyerDocuments)
      .where(eq(lawyerDocuments.lawyerUserId, lawyerUserId))
      .orderBy(lawyerDocuments.documentNumber);
  }
}
