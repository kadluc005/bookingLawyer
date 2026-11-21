import {
  BadRequestException,
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

export type LawyerProfileUpdate = Partial<
  Omit<
    NewLawyerProfile,
    | 'userId'
    | 'experienceYears'
    | 'reviewStatus'
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
  ) {}

  async createAccount(
    account: Pick<NewUser, 'email' | 'passwordHash'>,
    profile: NewLawyerAccountProfile,
  ) {
    return this.db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({ ...account, role: 'lawyer', status: 'active' })
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

  async reviewProfile(
    adminUserId: string,
    lawyerUserId: string,
    decision: 'approved' | 'rejected',
  ) {
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

    const [profile] = await this.db
      .update(lawyerProfiles)
      .set({
        reviewStatus: decision,
        reviewedBy: adminUserId,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(lawyerProfiles.userId, lawyerUserId))
      .returning();

    if (!profile) {
      throw new NotFoundException('Lawyer profile not found.');
    }

    return profile;
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
          pending: sql<number>`count(*) filter (where ${lawyerProfiles.reviewStatus} = 'pending_review')::int`,
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
