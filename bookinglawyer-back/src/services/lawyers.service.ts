import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, asc, desc, eq, exists, gt, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  lawyerDocuments,
  lawyerProfiles,
  memberships,
  users,
  type NewLawyerProfile,
  type NewUser,
} from '../database/schema.js';
import { LawyerDossierMailService } from '../mail/lawyer-dossier-mail.service.js';
import { AuditLogsService } from './audit-logs.service.js';

export type LawyerProfileUpdate = Partial<
  Omit<
    NewLawyerProfile,
    | 'userId'
    | 'experienceYears'
    | 'reviewStatus'
    | 'submittedAt'
    | 'rejectionReason'
    | 'reviewedBy'
    | 'reviewedAt'
    | 'createdAt'
    | 'updatedAt'
  >
>;

export type NewLawyerAccountProfile = Omit<
  NewLawyerProfile,
  | 'userId'
  | 'experienceYears'
  | 'reviewStatus'
  | 'submittedAt'
  | 'rejectionReason'
  | 'reviewedBy'
  | 'reviewedAt'
  | 'createdAt'
  | 'updatedAt'
>;

export type LawyerDirectoryQuery = {
  country?: string;
  city?: string;
  officeCountry?: string;
  officeCity?: string;
  specialty?: NewLawyerProfile['specialty'];
  sort?: 'alphabetical' | 'experience';
  limit?: number;
  offset?: number;
};

const MAX_PAGE_SIZE = 100;

@Injectable()
export class LawyersService {
  constructor(
    @InjectDrizzle()
    private readonly db: NodePgDatabase,
    private readonly auditLogs: AuditLogsService,
    private readonly dossierMail: LawyerDossierMailService,
  ) {}

  async createAccount(
    account: Pick<NewUser, 'email' | 'passwordHash'>,
    profile: NewLawyerAccountProfile,
  ) {
    return this.db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          ...account,
          role: 'lawyer',
          status: 'pending_email_verification',
        })
        .returning();
      const [lawyerProfile] = await tx
        .insert(lawyerProfiles)
        .values({ ...profile, userId: user.id })
        .returning();

      return { user, profile: lawyerProfile };
    });
  }

  async findProfile(userId: string) {
    const [profile] = await this.db
      .select()
      .from(lawyerProfiles)
      .where(eq(lawyerProfiles.userId, userId));

    if (!profile) {
      throw new NotFoundException('Lawyer profile not found.');
    }

    return profile;
  }

  async updateProfile(userId: string, changes: LawyerProfileUpdate) {
    const [profile] = await this.db
      .update(lawyerProfiles)
      .set({ ...changes, updatedAt: new Date() })
      .where(eq(lawyerProfiles.userId, userId))
      .returning();

    if (!profile) {
      throw new NotFoundException('Lawyer profile not found.');
    }

    return profile;
  }

  async submitProfile(lawyerUserId: string, changes: LawyerProfileUpdate) {
    const result = await this.db.transaction(async (tx) => {
      const { profile, email } = await this.lockDossier(tx, lawyerUserId);
      if (profile.reviewStatus === 'approved') {
        throw new ConflictException('Ce dossier est déjà approuvé.');
      }
      if (profile.submittedAt && profile.reviewStatus === 'pending_review') {
        return { profile, email, submitted: false };
      }

      const providedChanges = Object.fromEntries(
        Object.entries(changes).filter(([, value]) => value !== undefined),
      );
      const proposed = { ...profile, ...providedChanges };
      const requiredFields = [
        proposed.firstName,
        proposed.lastName,
        proposed.country,
        proposed.city,
        proposed.phone,
        proposed.officeStreet,
        proposed.officeNumber,
        proposed.specialty,
      ];
      if (requiredFields.some((value) => !value?.trim())) {
        throw new BadRequestException(
          'Complétez les champs obligatoires du profil avant de soumettre le dossier.',
        );
      }

      const now = new Date();
      const [submitted] = await tx
        .update(lawyerProfiles)
        .set({
          ...changes,
          submittedAt: now,
          reviewStatus: 'pending_review',
          rejectionReason: null,
          reviewedBy: null,
          reviewedAt: null,
          updatedAt: now,
        })
        .where(eq(lawyerProfiles.userId, lawyerUserId))
        .returning();
      await this.auditLogs.record(
        {
          actorUserId: lawyerUserId,
          action: 'lawyer.profile.submitted',
          entityType: 'lawyer_profile',
          entityId: lawyerUserId,
        },
        tx,
      );
      return { profile: submitted, email, submitted: true };
    });

    return {
      profile: result.profile,
      notificationSent: result.submitted
        ? await this.dossierMail.send(result.email, { kind: 'submitted' })
        : null,
    };
  }

  async reviewProfile(
    adminUserId: string,
    lawyerUserId: string,
    decision: 'approved' | 'rejected',
    reason?: string,
  ) {
    const rejectionReason = decision === 'rejected' ? reason?.trim() : undefined;
    if (decision === 'rejected' && (!rejectionReason || rejectionReason.length > 2000)) {
      throw new BadRequestException('Indiquez un motif de rejet de 1 à 2 000 caractères.');
    }
    const [admin] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.id, adminUserId),
          eq(users.role, 'admin'),
          eq(users.status, 'active'),
        ),
      );

    if (!admin) {
      throw new ForbiddenException('An active administrator is required.');
    }

    const result = await this.db.transaction(async (tx) => {
      const { profile, email } = await this.lockDossier(tx, lawyerUserId);
      if (!profile.submittedAt) {
        throw new ConflictException('Ce dossier n’a pas encore été soumis.');
      }
      if (profile.reviewStatus === decision && profile.rejectionReason === (rejectionReason ?? null)) {
        return { profile, email, changed: false };
      }

      const now = new Date();
      const [reviewed] = await tx
        .update(lawyerProfiles)
        .set({
          reviewStatus: decision,
          rejectionReason: rejectionReason ?? null,
          reviewedBy: adminUserId,
          reviewedAt: now,
          updatedAt: now,
        })
        .where(eq(lawyerProfiles.userId, lawyerUserId))
        .returning();
      await this.auditLogs.record(
        {
          actorUserId: adminUserId,
          action: `lawyer.profile.${decision}`,
          entityType: 'lawyer_profile',
          entityId: lawyerUserId,
          metadata: rejectionReason ? { reason: rejectionReason } : undefined,
        },
        tx,
      );
      return { profile: reviewed, email, changed: true };
    });
    const notificationSent = result.changed
      ? await this.dossierMail.send(
          result.email,
          rejectionReason
            ? { kind: 'rejected', reason: rejectionReason }
            : { kind: 'approved' },
        )
      : null;
    return { ...result.profile, notificationSent };
  }

  private async lockDossier(db: Pick<NodePgDatabase, 'select'>, lawyerUserId: string) {
    const [dossier] = await db
      .select({ profile: lawyerProfiles, email: users.email })
      .from(lawyerProfiles)
      .innerJoin(users, eq(users.id, lawyerProfiles.userId))
      .where(and(eq(lawyerProfiles.userId, lawyerUserId), eq(users.role, 'lawyer')))
      .for('update', { of: lawyerProfiles });
    if (!dossier) throw new NotFoundException('Lawyer profile not found.');
    return dossier;
  }

  async listLawyersForAdmin(limit = 20, offset = 0) {
    const [rows, counts] = await Promise.all([
      this.db
        .select({
          lawyerId: lawyerProfiles.userId,
          firstName: lawyerProfiles.firstName,
          lastName: lawyerProfiles.lastName,
          email: users.email,
          city: lawyerProfiles.city,
          country: lawyerProfiles.country,
          specialty: lawyerProfiles.specialty,
          reviewStatus: lawyerProfiles.reviewStatus,
          submittedAt: lawyerProfiles.submittedAt,
          accountStatus: users.status,
        })
        .from(lawyerProfiles)
        .innerJoin(users, eq(users.id, lawyerProfiles.userId))
        .where(eq(users.role, 'lawyer'))
        .orderBy(asc(lawyerProfiles.lastName), asc(lawyerProfiles.firstName), asc(lawyerProfiles.userId))
        .limit(limit)
        .offset(offset),
      this.db
        .select({
          total: sql<number>`count(*)::int`,
          pending: sql<number>`count(*) filter (where ${lawyerProfiles.reviewStatus} = 'pending_review' and ${lawyerProfiles.submittedAt} is not null)::int`,
        })
        .from(lawyerProfiles)
        .innerJoin(users, eq(users.id, lawyerProfiles.userId))
        .where(eq(users.role, 'lawyer')),
    ]);
    return { lawyers: rows, total: counts[0].total, pending: counts[0].pending };
  }

  async findLawyerForAdmin(userId: string) {
    const [lawyer] = await this.db
      .select({
        profile: lawyerProfiles,
        email: users.email,
        accountStatus: users.status,
      })
      .from(lawyerProfiles)
      .innerJoin(users, eq(users.id, lawyerProfiles.userId))
      .where(and(eq(lawyerProfiles.userId, userId), eq(users.role, 'lawyer')));
    if (!lawyer) throw new NotFoundException('Lawyer profile not found.');
    const membershipHistory = await this.db
      .select({
        id: memberships.id,
        status: sql<typeof memberships.$inferSelect.status>`
          case when ${memberships.status} = 'active' and ${memberships.endsAt} <= now()
            then 'expired' else ${memberships.status} end
        `,
        amount: memberships.amount,
        currency: memberships.currency,
        startsAt: memberships.startsAt,
        endsAt: memberships.endsAt,
        createdAt: memberships.createdAt,
      })
      .from(memberships)
      .where(eq(memberships.lawyerUserId, userId))
      .orderBy(desc(memberships.createdAt), desc(memberships.id));
    const documents = await this.db
      .select({
        id: lawyerDocuments.id,
        originalName: lawyerDocuments.originalName,
        mimeType: lawyerDocuments.mimeType,
        sizeBytes: lawyerDocuments.sizeBytes,
        createdAt: lawyerDocuments.createdAt,
      })
      .from(lawyerDocuments)
      .where(eq(lawyerDocuments.lawyerUserId, userId))
      .orderBy(asc(lawyerDocuments.documentNumber));
    return { ...lawyer, memberships: membershipHistory, documents };
  }

  listMembershipsForAdmin(limit = 20, offset = 0) {
    return this.db
      .select({
        membershipId: memberships.id,
        lawyerId: lawyerProfiles.userId,
        firstName: lawyerProfiles.firstName,
        lastName: lawyerProfiles.lastName,
        email: users.email,
        reviewStatus: lawyerProfiles.reviewStatus,
        membershipStatus: sql<typeof memberships.$inferSelect.status>`
          case when ${memberships.status} = 'active' and ${memberships.endsAt} <= now()
            then 'expired' else ${memberships.status} end
        `,
        createdAt: memberships.createdAt,
      })
      .from(memberships)
      .innerJoin(lawyerProfiles, eq(lawyerProfiles.userId, memberships.lawyerUserId))
      .innerJoin(users, eq(users.id, lawyerProfiles.userId))
      .where(eq(users.role, 'lawyer'))
      .orderBy(desc(memberships.createdAt), desc(memberships.id))
      .limit(limit)
      .offset(offset);
  }

  async findVisibleDirectory(query: LawyerDirectoryQuery = {}) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
      throw new BadRequestException(
        `Limit must be an integer between 1 and ${MAX_PAGE_SIZE}.`,
      );
    }
    if (!Number.isInteger(offset) || offset < 0) {
      throw new BadRequestException('Offset must be a non-negative integer.');
    }

    const filters = this.visibilityFilters();

    if (query.country) {
      filters.push(eq(lawyerProfiles.country, query.country));
    }
    if (query.city) {
      filters.push(eq(lawyerProfiles.city, query.city));
    }
    if (query.officeCountry) {
      filters.push(eq(lawyerProfiles.officeCountry, query.officeCountry));
    }
    if (query.officeCity) {
      filters.push(eq(lawyerProfiles.officeCity, query.officeCity));
    }
    if (query.specialty) {
      filters.push(eq(lawyerProfiles.specialty, query.specialty));
    }

    const ordering =
      query.sort === 'experience'
        ? [
            sql`${lawyerProfiles.experienceYears} DESC NULLS LAST`,
            asc(lawyerProfiles.lastName),
            asc(lawyerProfiles.firstName),
          ]
        : [asc(lawyerProfiles.lastName), asc(lawyerProfiles.firstName)];

    return this.db
      .select({
        userId: lawyerProfiles.userId,
        firstName: lawyerProfiles.firstName,
        lastName: lawyerProfiles.lastName,
        country: lawyerProfiles.country,
        city: lawyerProfiles.city,
        officeCountry: lawyerProfiles.officeCountry,
        officeCity: lawyerProfiles.officeCity,
        officeStreet: lawyerProfiles.officeStreet,
        officeNumber: lawyerProfiles.officeNumber,
        specialty: lawyerProfiles.specialty,
        photoStorageKey: lawyerProfiles.photoStorageKey,
        experienceYears: lawyerProfiles.experienceYears,
        websiteUrl: lawyerProfiles.websiteUrl,
      })
      .from(lawyerProfiles)
      .innerJoin(users, eq(users.id, lawyerProfiles.userId))
      .where(and(...filters))
      .orderBy(...ordering)
      .limit(limit)
      .offset(offset);
  }

  async findVisibleContactTarget(lawyerUserId: string) {
    const [target] = await this.db
      .select({
        email: users.email,
        phone: lawyerProfiles.phone,
      })
      .from(lawyerProfiles)
      .innerJoin(users, eq(users.id, lawyerProfiles.userId))
      .where(
        and(
          eq(lawyerProfiles.userId, lawyerUserId),
          ...this.visibilityFilters(),
        ),
      );

    if (!target) {
      throw new NotFoundException('Visible lawyer not found.');
    }

    return target;
  }

  private visibilityFilters(): SQL[] {
    return [
      eq(users.role, 'lawyer'),
      eq(users.status, 'active'),
      eq(lawyerProfiles.reviewStatus, 'approved'),
      exists(
        this.db
          .select({ id: memberships.id })
          .from(memberships)
          .where(
            and(
              eq(memberships.lawyerUserId, lawyerProfiles.userId),
              eq(memberships.status, 'active'),
              gt(memberships.endsAt, new Date()),
            ),
          ),
      ),
    ];
  }
}
