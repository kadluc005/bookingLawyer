import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['lawyer', 'client', 'admin']);
export const accountStatusEnum = pgEnum('account_status', [
  'pending_email_verification',
  'active',
  'suspended',
]);
export const lawyerReviewStatusEnum = pgEnum('lawyer_review_status', [
  'pending_review',
  'approved',
  'rejected',
]);
export const lawyerSpecialtyEnum = pgEnum('lawyer_specialty', [
  'criminal_law',
  'civil_law',
  'arbitration',
  'cybercrime',
]);
export const cvExtractionStatusEnum = pgEnum('cv_extraction_status', [
  'queued',
  'processing',
  'completed',
  'needs_review',
  'failed',
]);
export const membershipStatusEnum = pgEnum('membership_status', [
  'pending_payment',
  'active',
  'expired',
  'cancelled',
]);
export const paymentMethodEnum = pgEnum('payment_method', [
  'bank_transfer',
  'paypal',
  'cryptocurrency',
]);
export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'succeeded',
  'failed',
  'cancelled',
  'refunded',
]);
export const contactChannelEnum = pgEnum('contact_channel', ['email', 'phone']);

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 320 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    role: userRoleEnum().notNull(),
    status: accountStatusEnum().notNull().default('pending_email_verification'),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('users_email_lower_unique').on(sql`lower(${table.email})`),
    index('users_role_status_idx').on(table.role, table.status),
  ],
);

export const lawyerProfiles = pgTable(
  'lawyer_profiles',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    firstName: varchar('first_name', { length: 120 }).notNull(),
    lastName: varchar('last_name', { length: 120 }).notNull(),
    country: varchar('country', { length: 120 }).notNull(),
    city: varchar('city', { length: 120 }).notNull(),
    phone: varchar('phone', { length: 32 }).notNull(),
    officeCountry: varchar('office_country', { length: 120 }),
    officeCity: varchar('office_city', { length: 120 }),
    officeStreet: varchar('office_street', { length: 200 }),
    officeNumber: varchar('office_number', { length: 40 }),
    specialty: lawyerSpecialtyEnum().notNull(),
    photoStorageKey: text('photo_storage_key'),
    cvText: text('cv_text'),
    websiteUrl: text('website_url'),
    experienceYears: integer('experience_years'),
    reviewStatus: lawyerReviewStatusEnum('review_status')
      .notNull()
      .default('pending_review'),
    reviewedBy: uuid('reviewed_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      'lawyer_profiles_experience_nonnegative',
      sql`${table.experienceYears} IS NULL OR ${table.experienceYears} >= 0`,
    ),
    index('lawyer_profiles_directory_idx').on(
      table.reviewStatus,
      table.country,
      table.city,
      table.specialty,
    ),
    index('lawyer_profiles_office_location_idx').on(
      table.reviewStatus,
      table.officeCountry,
      table.officeCity,
    ),
    index('lawyer_profiles_name_idx').on(table.lastName, table.firstName),
    index('lawyer_profiles_experience_idx').on(table.experienceYears),
  ],
);

export const clientProfiles = pgTable(
  'client_profiles',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    firstName: varchar('first_name', { length: 120 }).notNull(),
    lastName: varchar('last_name', { length: 120 }).notNull(),
    country: varchar('country', { length: 120 }).notNull(),
    city: varchar('city', { length: 120 }).notNull(),
    phone: varchar('phone', { length: 32 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('client_profiles_name_idx').on(table.lastName, table.firstName),
    index('client_profiles_location_idx').on(table.country, table.city),
  ],
);

export const lawyerDocuments = pgTable(
  'lawyer_documents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    lawyerUserId: uuid('lawyer_user_id')
      .notNull()
      .references(() => lawyerProfiles.userId, { onDelete: 'cascade' }),
    documentNumber: smallint('document_number').notNull(),
    storageKey: text('storage_key').notNull(),
    originalName: varchar('original_name', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 127 }).notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      'lawyer_documents_number_range',
      sql`${table.documentNumber} BETWEEN 1 AND 5`,
    ),
    check('lawyer_documents_size_positive', sql`${table.sizeBytes} > 0`),
    uniqueIndex('lawyer_documents_storage_key_unique').on(table.storageKey),
    uniqueIndex('lawyer_documents_lawyer_number_unique').on(
      table.lawyerUserId,
      table.documentNumber,
    ),
    index('lawyer_documents_lawyer_idx').on(table.lawyerUserId),
  ],
);

export type CvExtractedField<T> = {
  value: T | null;
  confidence: number | null;
};

export type CvExtractionResult = {
  firstName?: CvExtractedField<string>;
  lastName?: CvExtractedField<string>;
  email?: CvExtractedField<string>;
  phone?: CvExtractedField<string>;
  country?: CvExtractedField<string>;
  city?: CvExtractedField<string>;
  specialty?: CvExtractedField<string>;
  experienceYears?: CvExtractedField<number>;
};

export const cvExtractions = pgTable(
  'cv_extractions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    documentId: uuid('document_id')
      .notNull()
      .references(() => lawyerDocuments.id, { onDelete: 'cascade' }),
    status: cvExtractionStatusEnum().notNull().default('queued'),
    extractedData: jsonb('extracted_data').$type<CvExtractionResult>(),
    failureReason: text('failure_reason'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    index('cv_extractions_document_created_idx').on(
      table.documentId,
      table.createdAt,
    ),
  ],
);

export const memberships = pgTable(
  'memberships',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    lawyerUserId: uuid('lawyer_user_id')
      .notNull()
      .references(() => lawyerProfiles.userId, { onDelete: 'cascade' }),
    status: membershipStatusEnum().notNull().default('pending_payment'),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('EUR'),
    startsAt: timestamp('starts_at', { withTimezone: true }),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('memberships_lawyer_status_idx').on(table.lawyerUserId, table.status),
  ],
);

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    membershipId: uuid('membership_id')
      .notNull()
      .references(() => memberships.id, { onDelete: 'cascade' }),
    method: paymentMethodEnum().notNull(),
    status: paymentStatusEnum().notNull().default('pending'),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('EUR'),
    provider: varchar('provider', { length: 80 }),
    providerReference: varchar('provider_reference', { length: 255 }),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('payments_provider_reference_unique')
      .on(table.provider, table.providerReference)
      .where(sql`${table.providerReference} IS NOT NULL`),
    index('payments_membership_status_idx').on(
      table.membershipId,
      table.status,
    ),
  ],
);

export const contactEvents = pgTable(
  'contact_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clientUserId: uuid('client_user_id')
      .notNull()
      .references(() => clientProfiles.userId, { onDelete: 'cascade' }),
    lawyerUserId: uuid('lawyer_user_id')
      .notNull()
      .references(() => lawyerProfiles.userId, { onDelete: 'cascade' }),
    channel: contactChannelEnum().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('contact_events_lawyer_created_idx').on(
      table.lawyerUserId,
      table.createdAt,
    ),
    index('contact_events_client_created_idx').on(
      table.clientUserId,
      table.createdAt,
    ),
  ],
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    actorUserId: uuid('actor_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    action: varchar('action', { length: 120 }).notNull(),
    entityType: varchar('entity_type', { length: 120 }).notNull(),
    entityId: uuid('entity_id'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('audit_logs_actor_created_idx').on(
      table.actorUserId,
      table.createdAt,
    ),
    index('audit_logs_entity_idx').on(table.entityType, table.entityId),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type LawyerProfile = typeof lawyerProfiles.$inferSelect;
export type NewLawyerProfile = typeof lawyerProfiles.$inferInsert;
export type ClientProfile = typeof clientProfiles.$inferSelect;
export type NewClientProfile = typeof clientProfiles.$inferInsert;
export type PaymentStatus = typeof payments.$inferSelect.status;
