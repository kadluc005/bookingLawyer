ALTER TABLE "memberships" DROP CONSTRAINT "memberships_lawyer_user_id_lawyer_profiles_user_id_fkey";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "temporary_password_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_lawyer_user_id_users_id_fkey" FOREIGN KEY ("lawyer_user_id") REFERENCES "users"("id") ON DELETE CASCADE;