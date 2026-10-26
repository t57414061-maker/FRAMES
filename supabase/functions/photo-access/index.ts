import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return respond({ error: "POST required" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error("photo-access is missing required server environment variables");
    return respond({ error: "Server configuration error" }, 500);
  }

  try {
    const body = await req.json();
    const mode = body?.mode;
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let userId: string | null = null;
    let userEmail: string | null = null;
    if (token && token !== anonKey) {
      const { data, error } = await authClient.auth.getUser(token);
      if (!error && data.user) {
        userId = data.user.id;
        userEmail = data.user.email?.toLowerCase() ?? null;
      }
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const isAdmin = async (id: string | null) => {
      if (!id) return false;
      const { data, error } = await admin.from("gallery_admins").select("user_id").eq("user_id", id).maybeSingle();
      if (error) throw error;
      return Boolean(data);
    };

    if (mode === "view" || mode === "download") {
      const path = body?.storage_path;
      if (typeof path !== "string" || !path || path.length > 500 || path.startsWith("/") || path.includes("..")) {
        return respond({ error: "Invalid photo request" }, 400);
      }

      const { data: photo, error } = await admin
        .from("photos")
        .select("id,owner,storage_path,approved,visibility,deleted_at,moderation_status")
        .eq("storage_path", path)
        .maybeSingle();
      if (error || !photo) return respond({ error: "Photo not found or access denied" }, 404);

      const adminUser = await isAdmin(userId);
      const isPublic = photo.approved === true
        && photo.visibility === "public"
        && photo.deleted_at === null
        && photo.moderation_status === "clear";

      let allowed = isPublic;
      if (!allowed && userId) {
        if (photo.owner === userId || adminUser) {
          // Owners and admins can inspect their own/administered items, including Recently Deleted.
          allowed = true;
        } else if (photo.deleted_at === null && photo.visibility === "private" && photo.approved === true) {
          const { data: share, error: shareError } = await admin
            .from("photo_shares")
            .select("id")
            .eq("photo_id", photo.id)
            .eq("shared_with_user_id", userId)
            .maybeSingle();
          if (shareError) throw shareError;
          allowed = Boolean(share);
        }
      }
      if (!allowed) return respond({ error: "This photo is private or unavailable" }, 403);

      const { data: signed, error: signError } = await admin.storage
        .from("frame-photos")
        .createSignedUrl(path, 300, mode === "download" ? { download: true } : undefined);
      if (signError || !signed?.signedUrl) {
        console.error("Signed URL error:", signError?.message);
        return respond({ error: "Could not prepare photo URL" }, 500);
      }
      return respond({ signedUrl: signed.signedUrl });
    }

    if (!userId) return respond({ error: "Please sign in with Google first" }, 401);

    if (mode === "share-photo" || mode === "revoke-share") {
      const photoId = body?.photo_id;
      const email = typeof body?.recipient_email === "string" ? body.recipient_email.trim().toLowerCase() : "";
      if (typeof photoId !== "string" || !email || !email.includes("@") || email.length > 320) {
        return respond({ error: "A valid photo and recipient email are required" }, 400);
      }
      const { data: photo, error: photoError } = await admin.from("photos")
        .select("id,owner,visibility,approved,deleted_at")
        .eq("id", photoId).maybeSingle();
      if (photoError || !photo) return respond({ error: "Photo not found" }, 404);
      if (photo.owner !== userId) return respond({ error: "Only the photo owner can manage sharing" }, 403);
      if (photo.visibility !== "private" || photo.deleted_at !== null) {
        return respond({ error: "Only active private photos can be shared" }, 400);
      }

      const { data: users, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (usersError) throw usersError;
      const recipient = users.users.find((u) => u.email?.toLowerCase() === email);
      if (!recipient) return respond({ error: "No FRAME account was found for that email" }, 404);
      if (recipient.id === userId) return respond({ error: "You already own this photo" }, 400);

      if (mode === "share-photo") {
        const { error: insertError } = await admin.from("photo_shares").upsert({
          photo_id: photoId,
          shared_by_user_id: userId,
          shared_with_user_id: recipient.id,
        }, { onConflict: "photo_id,shared_with_user_id" });
        if (insertError) throw insertError;
      } else {
        const { error: deleteError } = await admin.from("photo_shares").delete()
          .eq("photo_id", photoId)
          .eq("shared_by_user_id", userId)
          .eq("shared_with_user_id", recipient.id);
        if (deleteError) throw deleteError;
      }
      return respond({ success: true });
    }

    if (mode === "permanent-delete") {
      const photoId = body?.photo_id;
      if (typeof photoId !== "string") return respond({ error: "Photo ID is required" }, 400);
      const adminUser = await isAdmin(userId);
      if (!adminUser) return respond({ error: "Admin access required" }, 403);
      const { data: photo, error: photoError } = await admin.from("photos")
        .select("id,storage_path").eq("id", photoId).maybeSingle();
      if (photoError || !photo) return respond({ error: "Photo not found" }, 404);
      const { error: storageError } = await admin.storage.from("frame-photos").remove([photo.storage_path]);
      if (storageError) {
        console.error("Storage deletion failed:", storageError.message);
        return respond({ error: "Could not remove the stored photo file" }, 500);
      }
      const { error: deleteError } = await admin.from("photos").delete().eq("id", photoId);
      if (deleteError) throw deleteError;
      return respond({ success: true });
    }

    if (mode === "list-users" || mode === "set-user-ban") {
      if (!(await isAdmin(userId))) return respond({ error: "Admin access required" }, 403);
      if (mode === "list-users") {
        const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (error) throw error;
        return respond({
          users: data.users.map((u) => ({
            id: u.id,
            email: u.email ?? null,
            created_at: u.created_at,
            banned: Boolean(u.banned_until && new Date(u.banned_until).getTime() > Date.now()),
          })),
        });
      }
      const targetId = body?.user_id;
      const banned = body?.banned;
      if (typeof targetId !== "string" || typeof banned !== "boolean") {
        return respond({ error: "A user ID and boolean banned value are required" }, 400);
      }
      if (targetId === userId) return respond({ error: "You cannot suspend your own admin account" }, 400);
      const { error } = await admin.auth.admin.updateUserById(targetId, {
        ban_duration: banned ? "876000h" : "none",
      });
      if (error) throw error;
      return respond({ success: true });
    }

    return respond({ error: "Unsupported mode" }, 400);
  } catch (error) {
    console.error("photo-access request failed:", error);
    return respond({ error: "Request failed. Please try again." }, 500);
  }
});
