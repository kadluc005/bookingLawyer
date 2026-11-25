ALTER TABLE "lawyer_profiles" ADD COLUMN "submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "lawyer_profiles" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
WITH previous_updates AS (
  SELECT entity_id, min(created_at) AS updated_at
  FROM audit_logs
  WHERE entity_type = 'lawyer_profile' AND action = 'lawyer.profile.updated'
  GROUP BY entity_id
),
previous_memberships AS (
  SELECT lawyer_user_id, min(created_at) AS created_at
  FROM memberships
  GROUP BY lawyer_user_id
)
UPDATE lawyer_profiles AS profile
SET submitted_at = COALESCE(
  (SELECT updated_at FROM previous_updates WHERE entity_id = profile.user_id),
  (SELECT created_at FROM previous_memberships WHERE lawyer_user_id = profile.user_id),
  CASE WHEN profile.review_status IN ('approved', 'rejected')
    THEN COALESCE(profile.reviewed_at, profile.updated_at)
  END
);
