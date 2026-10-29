# FRAME coordinated security release — review only

## Website
FRAME is dark-only. The appearance selector and persisted theme switching are removed; Settings keeps text size, reduced motion, accent colour, compact gallery, and default filter. Dark styling is the default base and is forced at initialization/reset.

## Supabase function source
A proposed tracked source file is included at supabase/functions/Photo-access/index.ts. It:
- reads the cleanup credential from the managed FRAME_PURGE_KEY secret and fails closed if absent;
- checks approval, moderation, deletion, and visibility before minting signed URLs;
- restricts private photos to owner/admin/explicit share recipients;
- checks errors when deleting related rows.

This is proposed source only. The active Supabase function is not changed by this PR. Before deployment, configure the secret, rotate the exposed old credential, test all view/download/share/delete cases in staging, and confirm deployed function configuration.

## Database draft
docs/security-hardening-review.sql is a review draft, not an automatically applied migration. It addresses the broad owner-delete policy, sensitive photo updates, follower-list privacy, and candidate indexes. Review the app's direct UPDATE/DELETE calls and validate this SQL against a staging copy before running it anywhere.

## Required checks
- Google sign-in/out and banned-account handling.
- Dark-only theme after first load, settings reset, and refresh.
- Remaining settings persist and work.
- Upload limit is 5 MiB; animated GIFs are not silently flattened.
- Public/private view, download, share/revoke, soft-delete/restore, purge, permanent delete, reports, admin, likes/comments/follows/notifications.
- Run Supabase security/performance advisors and review query plans.
- No production database, function, secrets, or photo records are changed by this PR.
