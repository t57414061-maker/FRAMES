# FRAME auto-publish verification — review checklist

Status: proposed release verification only. This document does not change the live Supabase project.

## Supported upload types today

The current upload control and client-side validation accept **photos only**:
- JPEG / JPG (`image/jpeg`)
- PNG (`image/png`)
- WEBP (`image/webp`)
- GIF (`image/gif`)

The uploader accepts up to 8 images per submission and enforces the existing 5 MiB limit after image compression (animated GIFs are not silently flattened). There are no separate video, story, or standalone artwork media models in the current database schema. Do not advertise those as supported until schema, upload validation, rendering, storage access, and RLS are implemented and tested.

## Expected publish behavior

- The client inserts each new photo with `approved: true` and `moderation_status: 'clear'`.
- The selected visibility is preserved: `public` photos can appear in the public gallery; `private` photos must remain accessible only to their owner, an authorized admin, or explicit share recipients.
- Newly published public photos must have `deleted_at IS NULL`.
- Public gallery reads must continue to require approved + public + not deleted + acceptable moderation status.
- An admin can still unpublish a photo or act on a report. Auto-publish does not disable reporting, privacy controls, or admin removal.
- The admin pending list is a legacy queue for older rows that are still unapproved; it should not imply new uploads wait for approval.

## Pre-release verification (staging only)

Use a staging account and non-sensitive test images. Do not create test rows in production just to complete this checklist.

1. Upload one small JPEG, PNG, WEBP, and GIF individually as **Public**.
2. Confirm each upload succeeds and appears in the public gallery after refresh without admin approval.
3. Upload another image as **Private**. Confirm it is absent from the public gallery, appears in the owner's private library, and cannot be viewed by another ordinary account.
4. Confirm oversized/unsupported files are rejected and the 5 MiB limit still applies.
5. Confirm reporting can hide/restrict a reported photo and admin unpublish still removes a public photo from the gallery.
6. Confirm a soft-deleted photo is not returned in the public gallery or given a public signed URL.
7. Repeat after signing out/in and on a mobile viewport.

## Read-only database check

Run this SELECT in staging after test uploads. It checks recent rows without modifying data:

```sql
select id, owner, caption, storage_path, approved, visibility,
       moderation_status, deleted_at, created_at
from public.photos
where created_at > now() - interval '1 day'
order by created_at desc
limit 30;
```

For each newly published test photo, expect `approved = true`, `moderation_status = 'clear'`, and `deleted_at IS NULL`. Public tests should have `visibility = 'public'`; private tests should have `visibility = 'private'`. Confirm gallery visibility separately in the client.

## Production safety

- This PR does not deploy the proposed Edge Function or apply the review-only SQL.
- Do not weaken RLS to make an upload test pass. Fix the policy or uploader together and retest in staging.
- Do not add video/story/art media claims until the data model and signed-URL/access rules support them.
