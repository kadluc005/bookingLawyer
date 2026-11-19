import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  cvExtractions,
  lawyerDocuments,
  lawyerProfiles,
  type CvExtractionResult,
  type NewLawyerProfile,
} from '../database/schema.js';

@Injectable()
export class CvExtractionsService {
  constructor(
    @InjectDrizzle()
    private readonly db: NodePgDatabase,
  ) {}

  async queue(documentId: string) {
    const [document] = await this.db
      .select({ id: lawyerDocuments.id })
      .from(lawyerDocuments)
      .where(eq(lawyerDocuments.id, documentId));

    if (!document) {
      throw new NotFoundException('Lawyer document not found.');
    }

    const [extraction] = await this.db
      .insert(cvExtractions)
      .values({ documentId })
      .returning();

    return extraction;
  }

  async markProcessing(extractionId: string) {
    return this.updateExtraction(extractionId, {
      status: 'processing',
      failureReason: null,
    });
  }

  async complete(extractionId: string, extractedData: CvExtractionResult) {
    return this.updateExtraction(extractionId, {
      status: 'completed',
      extractedData,
      failureReason: null,
      completedAt: new Date(),
    });
  }

  async markNeedsReview(
    extractionId: string,
    extractedData: CvExtractionResult,
  ) {
    return this.updateExtraction(extractionId, {
      status: 'needs_review',
      extractedData,
      failureReason: null,
      completedAt: new Date(),
    });
  }

  async fail(extractionId: string, reason: string) {
    return this.updateExtraction(extractionId, {
      status: 'failed',
      failureReason: reason,
      completedAt: new Date(),
    });
  }

  async confirmExtractedFields(
    lawyerUserId: string,
    extractionId: string,
    fields: Partial<
      Pick<
        NewLawyerProfile,
        | 'firstName'
        | 'lastName'
        | 'country'
        | 'city'
        | 'phone'
        | 'specialty'
        | 'experienceYears'
      >
    >,
  ) {
    if (Object.keys(fields).length === 0) {
      throw new BadRequestException('At least one field must be confirmed.');
    }

    return this.db.transaction(async (tx) => {
      const [extraction] = await tx
        .select({ id: cvExtractions.id, status: cvExtractions.status })
        .from(cvExtractions)
        .innerJoin(
          lawyerDocuments,
          eq(lawyerDocuments.id, cvExtractions.documentId),
        )
        .where(
          and(
            eq(cvExtractions.id, extractionId),
            eq(lawyerDocuments.lawyerUserId, lawyerUserId),
          ),
        );

      if (!extraction) {
        throw new NotFoundException('CV extraction not found for this lawyer.');
      }
      if (
        extraction.status !== 'completed' &&
        extraction.status !== 'needs_review'
      ) {
        throw new BadRequestException(
          'Only a completed CV extraction can be confirmed.',
        );
      }

      const [profile] = await tx
        .update(lawyerProfiles)
        .set({ ...fields, updatedAt: new Date() })
        .where(eq(lawyerProfiles.userId, lawyerUserId))
        .returning();

      if (!profile) {
        throw new NotFoundException('Lawyer profile not found.');
      }

      return profile;
    });
  }

  private async updateExtraction(
    extractionId: string,
    changes: Partial<typeof cvExtractions.$inferInsert>,
  ) {
    const [extraction] = await this.db
      .update(cvExtractions)
      .set(changes)
      .where(eq(cvExtractions.id, extractionId))
      .returning();

    if (!extraction) {
      throw new NotFoundException('CV extraction not found.');
    }

    return extraction;
  }
}
