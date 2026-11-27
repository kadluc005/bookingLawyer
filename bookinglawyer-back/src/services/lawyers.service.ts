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
} from '../database/schema.js';
import { LawyerDossierMailService } from '../mail/lawyer-dossier-mail.service.js';
import { LawyerWorkflowMailService } from '../mail/lawyer-workflow-mail.service.js';
import { UsersService } from './users.service.js';
import { AuditLogsService } from './audit-logs.service.js';

export type LawyerProfileUpdate = Partial<
  Omit<
    NewLawyerProfile,
    | 'userId'
    | 'reviewStatus'
    | 'submittedAt'
    | 'rejectionReason'
    | 'reviewedBy'
    | 'reviewedAt'
    | 'createdAt'
    | 'updatedAt'
  >
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
const profileFieldLabels: Record<keyof LawyerProfileUpdate, string> = {
  firstName: 'Prénom',
  lastName: 'Nom',
  country: 'Pays',
  city: 'Ville',
  phone: 'Téléphone',
  officeCountry: 'Pays du cabinet',
  officeCity: 'Ville du cabinet',
  officeStreet: 'Rue du cabinet',
  officeNumber: 'Numéro du cabinet',
  specialty: 'Spécialité',
  photoStorageKey: 'Photo',
  cvText: 'Présentation professionnelle',
  websiteUrl: 'Site web',
  experienceYears: 'Années de pratique',
};

@Injectable()
export class LawyersService {
  constructor(
    @InjectDrizzle()
    private readonly db: NodePgDatabase,
    private readonly auditLogs: AuditLogsService,
    private readonly dossierMail: LawyerDossierMailService,
    private readonly workflowMail: LawyerWorkflowMailService,
    private readonly usersService: UsersService,
  ) {}

  async findProfile(userId: string) {
    const [profile] = await this.db
      .select()
      .from(lawyerProfiles)
      .where(eq(lawyerProfiles.userId, userId));

    return profile ?? null;
  }

  async updateProfile(userId: string, changes: LawyerProfileUpdate) {
    const result = await this.db.transaction(async (tx) => {
      const { profile, email } = await this.lockDossier(tx, userId);
      const fields = changedProfileFields(profile, changes);
      if (!fields.length) return { profile, email, fields };
      const [updated] = await tx.update(lawyerProfiles)
        .set({ ...changes, updatedAt: new Date() })
        .where(eq(lawyerProfiles.userId, userId))
        .returning();
      await this.auditLogs.record({
        actorUserId: userId,
        action: 'lawyer.profile.updated',
        entityType: 'lawyer_profile',
        entityId: userId,
        metadata: { changedFields: fields },
      }, tx);
      return { profile: updated, email, fields };
    });
    const adminNotified = result.fields.length
      ? await this.notifyProfileChange(result.email, result.fields)
      : null;
    return { ...result.profile, adminNotified };
  }

  async submitProfile(lawyerUserId: string, changes: LawyerProfileUpdate) {
    const result = await this.db.transaction(async (tx) => {
      const [lawyer] = await tx.select({ email: users.email }).from(users)
        .where(and(eq(users.id, lawyerUserId), eq(users.role, 'lawyer'), eq(users.status, 'active')))
        .for('update');
      if (!lawyer) throw new NotFoundException('Compte avocat actif introuvable.');
      const [profile] = await tx.select().from(lawyerProfiles)
        .where(eq(lawyerProfiles.userId, lawyerUserId)).for('update');
      const email = lawyer.email;
      if (profile?.reviewStatus === 'approved') {
        throw new ConflictException('Ce dossier est déjà approuvé.');
      }
      if (profile?.submittedAt && profile.reviewStatus === 'pending_review') {
        return { profile, email, submitted: false, fields: [] };
      }
      await this.requireActiveMembership(tx, lawyerUserId);

      const fields = changedProfileFields(profile, changes);
      const proposed = {
        ...profile,
        ...Object.fromEntries(
          Object.entries(changes).filter(([, value]) => value !== undefined),
        ),
      };
      const { firstName, lastName, country, city, phone, specialty, officeStreet, officeNumber } = proposed;
      if (
        !firstName?.trim() || !lastName?.trim() || !country?.trim() || !city?.trim() ||
        !phone?.trim() || !specialty || !officeStreet?.trim() || !officeNumber?.trim()
      ) {
        throw new BadRequestException('Complétez les champs obligatoires du profil avant de soumettre le dossier.');
      }

      const now = new Date();
      const submission = {
        submittedAt: now,
        reviewStatus: 'pending_review' as const,
        rejectionReason: null,
        reviewedBy: null,
        reviewedAt: null,
        updatedAt: now,
      };
      const [submitted] = profile
        ? await tx.update(lawyerProfiles).set({ ...changes, ...submission })
            .where(eq(lawyerProfiles.userId, lawyerUserId)).returning()
        : await tx.insert(lawyerProfiles).values({
            ...changes, userId: lawyerUserId, firstName, lastName, country, city,
            phone, specialty, ...submission,
          }).returning();
      await this.auditLogs.record(
        {
          actorUserId: lawyerUserId,
          action: 'lawyer.profile.submitted',
          entityType: 'lawyer_profile',
          entityId: lawyerUserId,
          metadata: { changedFields: fields },
        },
        tx,
      );
      return { profile: submitted, email, submitted: true, fields };
    });

    const [notificationSent, adminNotified] = await Promise.all([
      result.submitted ? this.dossierMail.send(result.email, { kind: 'submitted' }) : null,
      result.fields.length ? this.notifyProfileChange(result.email, result.fields) : null,
    ]);
    return { profile: result.profile, notificationSent, adminNotified };
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

      if (decision === 'approved') await this.requireActiveMembership(tx, lawyerUserId);

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

  private async requireActiveMembership(db: Pick<NodePgDatabase, 'select'>, userId: string) {
    const [membership] = await db.select({ id: memberships.id }).from(memberships)
      .where(and(
        eq(memberships.lawyerUserId, userId),
        eq(memberships.status, 'active'),
        gt(memberships.endsAt, new Date()),
      )).limit(1);
    if (!membership) throw new ConflictException('Une cotisation active est requise.');
  }

  private async notifyProfileChange(
    email: string,
    fields: (keyof LawyerProfileUpdate)[],
  ) {
    const admins = await this.usersService.activeAdminEmails();
    return this.workflowMail.send('profile', admins, {
      email,
      fields: fields.map((field) => profileFieldLabels[field]),
    });
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
          lawyerId: users.id,
          firstName: lawyerProfiles.firstName,
          lastName: lawyerProfiles.lastName,
          email: users.email,
          city: lawyerProfiles.city,
          country: lawyerProfiles.country,
          specialty: lawyerProfiles.specialty,
          reviewStatus: lawyerProfiles.reviewStatus,
          submittedAt: lawyerProfiles.submittedAt,
          accountStatus: users.status,
          hasActiveMembership: exists(this.db.select({ id: memberships.id }).from(memberships)
            .where(and(eq(memberships.lawyerUserId, users.id), eq(memberships.status, 'active'), gt(memberships.endsAt, new Date())))).mapWith(Boolean),
        })
        .from(users)
        .leftJoin(lawyerProfiles, eq(users.id, lawyerProfiles.userId))
        .where(eq(users.role, 'lawyer'))
        .orderBy(asc(lawyerProfiles.lastName), asc(lawyerProfiles.firstName), asc(users.id))
        .limit(limit)
        .offset(offset),
      this.db
        .select({
          total: sql<number>`count(*)::int`,
          pending: sql<number>`count(*) filter (where ${lawyerProfiles.reviewStatus} = 'pending_review' and ${lawyerProfiles.submittedAt} is not null)::int`,
        })
        .from(users)
        .leftJoin(lawyerProfiles, eq(users.id, lawyerProfiles.userId))
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

function changedProfileFields(
  profile: typeof lawyerProfiles.$inferSelect | undefined,
  changes: LawyerProfileUpdate,
) {
  const fields = Object.keys(changes) as (keyof LawyerProfileUpdate)[];
  return fields.filter(
    (field) => changes[field] !== undefined && changes[field] !== profile?.[field],
  );
}
