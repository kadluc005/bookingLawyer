CREATE TYPE "account_status" AS ENUM('pending_email_verification', 'active', 'suspended');--> statement-breakpoint
CREATE TYPE "contact_channel" AS ENUM('email', 'phone');--> statement-breakpoint
CREATE TYPE "cv_extraction_status" AS ENUM('queued', 'processing', 'completed', 'needs_review', 'failed');--> statement-breakpoint
CREATE TYPE "lawyer_review_status" AS ENUM('pending_review', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "lawyer_specialty" AS ENUM('criminal_law', 'civil_law', 'arbitration', 'cybercrime');--> statement-breakpoint
CREATE TYPE "membership_status" AS ENUM('pending_payment', 'active', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "payment_method" AS ENUM('bank_transfer', 'paypal', 'cryptocurrency');--> statement-breakpoint
CREATE TYPE "payment_status" AS ENUM('pending', 'succeeded', 'failed', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "user_role" AS ENUM('lawyer', 'client', 'admin');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"actor_user_id" uuid,
	"action" varchar(120) NOT NULL,
	"entity_type" varchar(120) NOT NULL,
	"entity_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_profiles" (
	"user_id" uuid PRIMARY KEY,
	"first_name" varchar(120) NOT NULL,
	"last_name" varchar(120) NOT NULL,
	"country" varchar(120) NOT NULL,
	"city" varchar(120) NOT NULL,
	"phone" varchar(32) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"client_user_id" uuid NOT NULL,
	"lawyer_user_id" uuid NOT NULL,
	"channel" "contact_channel" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cv_extractions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"document_id" uuid NOT NULL,
	"status" "cv_extraction_status" DEFAULT 'queued'::"cv_extraction_status" NOT NULL,
	"extracted_data" jsonb,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "lawyer_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"lawyer_user_id" uuid NOT NULL,
	"document_number" smallint NOT NULL,
	"storage_key" text NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"mime_type" varchar(127) NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lawyer_documents_number_range" CHECK ("document_number" BETWEEN 1 AND 5),
	CONSTRAINT "lawyer_documents_size_positive" CHECK ("size_bytes" > 0)
);
--> statement-breakpoint
CREATE TABLE "lawyer_profiles" (
	"user_id" uuid PRIMARY KEY,
	"first_name" varchar(120) NOT NULL,
	"last_name" varchar(120) NOT NULL,
	"country" varchar(120) NOT NULL,
	"city" varchar(120) NOT NULL,
	"phone" varchar(32) NOT NULL,
	"office_country" varchar(120),
	"office_city" varchar(120),
	"office_street" varchar(200),
	"office_number" varchar(40),
	"specialty" "lawyer_specialty" NOT NULL,
	"photo_storage_key" text,
	"cv_text" text,
	"website_url" text,
	"experience_years" integer,
	"review_status" "lawyer_review_status" DEFAULT 'pending_review'::"lawyer_review_status" NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lawyer_profiles_experience_nonnegative" CHECK ("experience_years" IS NULL OR "experience_years" >= 0)
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"lawyer_user_id" uuid NOT NULL,
	"status" "membership_status" DEFAULT 'pending_payment'::"membership_status" NOT NULL,
	"amount" numeric(10,2) NOT NULL,
	"currency" varchar(3) DEFAULT 'EUR' NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"membership_id" uuid NOT NULL,
	"method" "payment_method" NOT NULL,
	"status" "payment_status" DEFAULT 'pending'::"payment_status" NOT NULL,
	"amount" numeric(10,2) NOT NULL,
	"currency" varchar(3) DEFAULT 'EUR' NOT NULL,
	"provider" varchar(80),
	"provider_reference" varchar(255),
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"email" varchar(320) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" NOT NULL,
	"status" "account_status" DEFAULT 'pending_email_verification'::"account_status" NOT NULL,
	"email_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "audit_logs_actor_created_idx" ON "audit_logs" ("actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "client_profiles_name_idx" ON "client_profiles" ("last_name","first_name");--> statement-breakpoint
CREATE INDEX "client_profiles_location_idx" ON "client_profiles" ("country","city");--> statement-breakpoint
CREATE INDEX "contact_events_lawyer_created_idx" ON "contact_events" ("lawyer_user_id","created_at");--> statement-breakpoint
CREATE INDEX "contact_events_client_created_idx" ON "contact_events" ("client_user_id","created_at");--> statement-breakpoint
CREATE INDEX "cv_extractions_document_created_idx" ON "cv_extractions" ("document_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "lawyer_documents_storage_key_unique" ON "lawyer_documents" ("storage_key");--> statement-breakpoint
CREATE UNIQUE INDEX "lawyer_documents_lawyer_number_unique" ON "lawyer_documents" ("lawyer_user_id","document_number");--> statement-breakpoint
CREATE INDEX "lawyer_documents_lawyer_idx" ON "lawyer_documents" ("lawyer_user_id");--> statement-breakpoint
CREATE INDEX "lawyer_profiles_directory_idx" ON "lawyer_profiles" ("review_status","country","city","specialty");--> statement-breakpoint
CREATE INDEX "lawyer_profiles_office_location_idx" ON "lawyer_profiles" ("review_status","office_country","office_city");--> statement-breakpoint
CREATE INDEX "lawyer_profiles_name_idx" ON "lawyer_profiles" ("last_name","first_name");--> statement-breakpoint
CREATE INDEX "lawyer_profiles_experience_idx" ON "lawyer_profiles" ("experience_years");--> statement-breakpoint
CREATE INDEX "memberships_lawyer_status_idx" ON "memberships" ("lawyer_user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_provider_reference_unique" ON "payments" ("provider","provider_reference") WHERE "provider_reference" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "payments_membership_status_idx" ON "payments" ("membership_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_unique" ON "users" (lower("email"));--> statement-breakpoint
CREATE INDEX "users_role_status_idx" ON "users" ("role","status");--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "client_profiles" ADD CONSTRAINT "client_profiles_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "contact_events" ADD CONSTRAINT "contact_events_client_user_id_client_profiles_user_id_fkey" FOREIGN KEY ("client_user_id") REFERENCES "client_profiles"("user_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "contact_events" ADD CONSTRAINT "contact_events_lawyer_user_id_lawyer_profiles_user_id_fkey" FOREIGN KEY ("lawyer_user_id") REFERENCES "lawyer_profiles"("user_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cv_extractions" ADD CONSTRAINT "cv_extractions_document_id_lawyer_documents_id_fkey" FOREIGN KEY ("document_id") REFERENCES "lawyer_documents"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "lawyer_documents" ADD CONSTRAINT "lawyer_documents_lawyer_user_id_lawyer_profiles_user_id_fkey" FOREIGN KEY ("lawyer_user_id") REFERENCES "lawyer_profiles"("user_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "lawyer_profiles" ADD CONSTRAINT "lawyer_profiles_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "lawyer_profiles" ADD CONSTRAINT "lawyer_profiles_reviewed_by_users_id_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_lawyer_user_id_lawyer_profiles_user_id_fkey" FOREIGN KEY ("lawyer_user_id") REFERENCES "lawyer_profiles"("user_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_membership_id_memberships_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE;