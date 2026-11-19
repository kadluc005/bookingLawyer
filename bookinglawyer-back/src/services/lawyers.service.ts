import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, asc, eq, exists, gt, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  lawyerProfiles,
  memberships,
  payments,
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

    const filters: SQL[] = [
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
              exists(
                this.db
                  .select({ id: payments.id })
                  .from(payments)
                  .where(
                    and(
                      eq(payments.membershipId, memberships.id),
                      eq(payments.status, 'succeeded'),
                    ),
                  ),
              ),
            ),
          ),
      ),
    ];

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
                  exists(
                    this.db
                      .select({ id: payments.id })
                      .from(payments)
                      .where(
                        and(
                          eq(payments.membershipId, memberships.id),
                          eq(payments.status, 'succeeded'),
                        ),
                      ),
                  ),
                ),
              ),
          ),
        ),
      );

    if (!target) {
      throw new NotFoundException('Visible lawyer not found.');
    }

    return target;
  }
}
