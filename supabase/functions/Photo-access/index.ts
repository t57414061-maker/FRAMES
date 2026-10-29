import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ADMIN_USER_ID = "1ef1e992-6649-4250-ae39-e66fc69778b6";
// Key for the scheduled cleanup only. Keep it private.
const PURGE_KEY_ENV = "FRAME_PURGE_KEY";
const BUCKET = "frame-photos";
const RETENTION_DAYS = 30;
const BAN_DURATION = "876000h";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-purge-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function removePhoto(admin: any, photo: { id: string; storage_path: string }) {
  const { error: storageError } = await admin.storage.from(BUCKET).remove([photo.storage_path]);
  if (storageError && !/not.?found/i.test(storageError.message ?? "")) throw storageError;
  for (const table of ["notifications", "photo_likes", "photo_comments", "photo_shares"]) {
    const { error } = await admin.from(table).delete().eq("photo_id", photo.id);
    if (error) throw error;
  }
  const { error } = await admin.from("photos").delete().eq("id", photo.id);
  if (error) throw error;
}

async function listAllUsers(admin: any) {
  const all: any[] = [];
  for (let page = 1; page < 100; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    all.push(...data.users);
    if (data.users.length < 200) break;
  }
  return all;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return respond({ error: "POST required" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error("Photo-access is missing required Supabase environment variables.");
    return respond({ error: "Server configuration error" }, 500);
  }

  try {
    const body = await req.json();
    const mode = body?.mode;
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

    // Scheduled cleanup: no signed-in user, checked with a private key.
    if (mode === "purge-expired") {
      const purgeKey = Deno.env.get(PURGE_KEY_ENV);
      if (!purgeKey) {
        console.error("Photo-access cleanup secret is not configured.");
        return respond({ error: "Cleanup not configured" }, 503);
      }
      if (req.headers.get("x-purge-key") !== purgeKey) return respond({ error: "Forbidden" }, 403);
      const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400000).toISOString();
      const { data: rows, error } = await admin.from("photos").select("id, storage_path").lt("deleted_at", cutoff).limit(500);
      if (error) throw error;
      for (const row of rows ?? []) await removePhoto(admin, row);
      return respond({ purged: (rows ?? []).length });
    }

    // Work out who is calling. Banned accounts count as signed out.
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    let userId: string | null = null;
    if (token && token !== anonKey) {
      const { data, error } = await admin.auth.getUser(token);
      const bannedUntil = data?.user?.banned_until ? Date.parse(data.user.banned_until) : 0;
      if (!error && data?.user && bannedUntil <= Date.now()) userId = data.user.id;
    }
    let isAdmin = userId === ADMIN_USER_ID;
    if (userId) {
      const { data: adminRecord, error: adminLookupError } = await admin
        .from("gallery_admins").select("user_id").eq("user_id", userId).maybeSingle();
      if (adminLookupError) throw adminLookupError;
      if (adminRecord) isAdmin = true;
    }

    // Photo viewing and downloads. Visitors can view; downloads need sign-in.
    if (mode === "view" || mode === "download") {
      const path = body?.storage_path;
      if (typeof path !== "string" || !path || path.length > 500 || path.startsWith("/") || path.includes("..")) {
        return respond({ error: "Invalid photo request" }, 400);
      }
      if (mode === "download" && !userId) return respond({ error: "Please sign in to download photos" }, 401);
      const { data: photo, error: photoError } = await admin
        .from("photos")
        .select("id, owner, storage_path, approved, visibility, deleted_at, moderation_status")
        .eq("storage_path", path)
        .maybeSingle();
      if (photoError || !photo) return respond({ error: "Photo not found or access denied" }, 404);
      // Signed URLs bypass later RLS checks, so validate publication state before minting one.
      if (photo.deleted_at || !photo.approved || photo.moderation_status !== "clear") {
        return respond({ error: "Photo not found or access denied" }, 404);
      }
      if (photo.visibility === "private") {
        if (!userId) return respond({ error: "Photo not found or access denied" }, 404);
        const { data: share, error: shareError } = await admin
          .from("photo_shares").select("id").eq("photo_id", photo.id)
          .eq("shared_with_user_id", userId).maybeSingle();
        if (shareError) throw shareError;
        if (photo.owner !== userId && !isAdmin && !share) {
          return respond({ error: "Photo not found or access denied" }, 404);
        }
      } else if (photo.visibility !== "public") {
        return respond({ error: "Photo not found or access denied" }, 404);
      }
      const { data: signed, error: signedError } = await admin.storage.from(BUCKET)
        .createSignedUrl(path, 3600, mode === "download" ? { download: true } : undefined);
      if (signedError || !signed?.signedUrl) {
        console.error("Signed URL error:", signedError?.message);
        return respond({ error: "Could not prepare photo URL" }, 500);
      }
      return respond({ signedUrl: signed.signedUrl });
    }

    // Everything below needs a signed-in account.
    if (!userId) return respond({ error: "Please sign in" }, 401);

    // Delete for good: only photos already in Recently Deleted.
    if (mode === "permanent-delete") {
      const photoId = body?.photo_id;
      if (typeof photoId !== "string") return respond({ error: "photo_id is required" }, 400);
      const { data: photo, error } = await admin.from("photos").select("id, owner, storage_path, deleted_at").eq("id", photoId).maybeSingle();
      if (error) throw error;
      if (!photo) return respond({ error: "Photo not found" }, 404);
      if (photo.owner !== userId && !isAdmin) return respond({ error: "Not allowed" }, 403);
      if (!photo.deleted_at) return respond({ error: "Move the photo to Recently Deleted first" }, 400);
      await removePhoto(admin, photo);
      return respond({ ok: true });
    }

    // Share a private photo with someone, or stop sharing it.
    if (mode === "share-photo" || mode === "revoke-share") {
      const photoId = body?.photo_id;
      const email = body?.recipient_email;
      if (typeof photoId !== "string" || typeof email !== "string" || !email.includes("@")) {
        return respond({ error: "photo_id and recipient_email are required" }, 400);
      }
      const { data: photo, error } = await admin.from("photos").select("id, owner, visibility, deleted_at").eq("id", photoId).maybeSingle();
      if (error) throw error;
      if (!photo || photo.deleted_at) return respond({ error: "Photo not found" }, 404);
      if (photo.owner !== userId && !isAdmin) return respond({ error: "Not allowed" }, 403);
      const wanted = email.trim().toLowerCase();
      const recipient = (await listAllUsers(admin)).find((u: any) => (u.email ?? "").toLowerCase() === wanted);
      if (!recipient) return respond({ error: "No FRAME account uses that email yet" }, 404);

      if (mode === "revoke-share") {
        const { error: delError } = await admin.from("photo_shares").delete().eq("photo_id", photoId).eq("shared_with_user_id", recipient.id);
        if (delError) throw delError;
        return respond({ ok: true });
      }

      if (photo.visibility !== "private") return respond({ error: "Only private photos can be shared" }, 400);
      if (recipient.id === photo.owner) return respond({ error: "That is your own account" }, 400);
      const { data: existing } = await admin.from("photo_shares").select("id").eq("photo_id", photoId).eq("shared_with_user_id", recipient.id).maybeSingle();
      if (!existing) {
        const { error: insError } = await admin.from("photo_shares").insert({
          photo_id: photoId,
          shared_by_user_id: photo.owner,
          shared_with_user_id: recipient.id,
        });
        if (insError) throw insError;
        await admin.from("notifications").insert({
          user_id: recipient.id,
          actor_id: photo.owner,
          type: "share",
          title: "A photo was shared with you",
          body: "Open Shared with me to see it.",
          photo_id: photoId,
        });
      }
      return respond({ ok: true });
    }

    // Admin: list accounts.
    if (mode === "list-users") {
      if (!isAdmin) return respond({ error: "Admins only" }, 403);
      const users = await listAllUsers(admin);
      const now = Date.now();
      return respond({
        users: users.map((u: any) => ({
          id: u.id,
          email: u.email ?? null,
          created_at: u.created_at,
          banned: !!u.banned_until && Date.parse(u.banned_until) > now,
        })),
      });
    }

    // Admin: suspend or restore an account. A suspended account can't sign in.
    if (mode === "set-user-ban") {
      if (!isAdmin) return respond({ error: "Admins only" }, 403);
      const target = body?.user_id;
      const banned = body?.banned === true;
      if (typeof target !== "string") return respond({ error: "user_id is required" }, 400);
      if (target === ADMIN_USER_ID) return respond({ error: "The admin account cannot be suspended" }, 400);
      const { error } = await admin.auth.admin.updateUserById(target, { ban_duration: banned ? BAN_DURATION : "none" });
      if (error) throw error;
      return respond({ ok: true });
    }

    return respond({ error: "Unknown request" }, 400);
  } catch (error) {
    console.error("Photo-access request failed:", error instanceof Error ? error.message : error);
    return respond({ error: "Server error" }, 500);
  }
});
