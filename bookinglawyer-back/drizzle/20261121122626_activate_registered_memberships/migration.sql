WITH registered_memberships AS (
    SELECT id, created_at,
        (created_at AT TIME ZONE 'UTC' + interval '1 year') AT TIME ZONE 'UTC' AS expires_at
    FROM memberships
    WHERE status = 'pending_payment'
)
UPDATE memberships AS membership
SET starts_at = registered.created_at,
    ends_at = registered.expires_at,
    status = CASE
        WHEN registered.expires_at > now() THEN 'active'::membership_status
        ELSE 'expired'::membership_status
    END,
    updated_at = now()
FROM registered_memberships AS registered
WHERE membership.id = registered.id AND membership.status = 'pending_payment';
