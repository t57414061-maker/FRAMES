# FRAME coordinated security remediation plan

Review document only. Do not run SQL from this document or apply changes directly to production.

## Critical: Photo-access
The active function contains a hard-coded cleanup credential. Treat it as exposed. Move it to a managed Edge Function secret (for example, FRAME_PURGE_KEY), make the function fail closed if the secret is absent, and rotate the old credential. Never commit the credential to source control.

Before minting signed URLs, enforce the complete photo state: reject soft-deleted rows; require approved and clear moderation state; require authentication for downloads; allow private media only to the owner, admin, or explicitly shared recipient. Test public/private, deleted, unapproved, moderated, banned-account, and revoked-share cases. Check errors when cleaning up related records during permanent deletion.

## Database authorization
- Two permissive DELETE policies exist on photos. Because permissive policies combine with OR, the broad owner policy can bypass a narrower unapproved-only policy.
- Owner row-update policy does not restrict sensitive columns. Prevent direct client updates to approval, moderation status, storage path, visibility, and deleted_at while retaining legitimate caption/genre/camera edits after reviewing client update calls.
- SECURITY DEFINER function frame_profile_connections does not enforce profiles.hide_followers. Respect the privacy preference for followers/following lists while allowing the owner and authorized admins.
- Audit EXECUTE grants on SECURITY DEFINER functions; keep explicit authorization checks and fixed search_path.

Do not apply broad column grants until actual update calls are reviewed. Prepare a migration and validate it against staging before production.

## Performance
Check query plans and foreign keys before adding indexes. Candidate missing indexes from the read-only audit: photo_comments(photo_id), notifications(photo_id), follows(following_id). Existing indexes cover photo_likes(photo_id,user_id) and share lookups.

## Verification
Test Google auth, dark-only settings, upload limits and media formats, public/private view/download/share, soft-delete/restore, purge, permanent delete, reports, admin tools, likes/comments/follows/notifications, and run Supabase security/performance advisors after reviewed changes.

No production database, function, secret, or photo data was changed as part of this plan.
