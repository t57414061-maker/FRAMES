-- FRAME security hardening draft.
-- REVIEW ONLY: this file is intentionally under docs/, not supabase/migrations/.
-- Do not execute against production until staged, reviewed, and approved.

begin;

-- Remove the broad owner delete policy. The remaining owner-delete policy is limited
-- to unapproved rows; permanent deletion should flow through Photo-access after soft-delete.
drop policy if exists "FRAME owner can delete own photos" on public.photos;

-- Block owners from changing privileged photo state through direct client UPDATEs.
-- Registered gallery admins and service-role operations remain permitted.
create or replace function public.frame_guard_photo_owner_updates()
returns trigger language plpgsql security invoker
set search_path = public, pg_temp
as $function$
declare
  v_actor uuid := auth.uid();
  v_is_admin boolean := false;
begin
  if v_actor is null then return new; end if;
  select exists (select 1 from public.gallery_admins ga where ga.user_id = v_actor)
    into v_is_admin;
  if not v_is_admin and (
    new.owner is distinct from old.owner
    or new.storage_path is distinct from old.storage_path
    or new.approved is distinct from old.approved
    or new.moderation_status is distinct from old.moderation_status
    or new.visibility is distinct from old.visibility
    or new.deleted_at is distinct from old.deleted_at
  ) then
    raise exception 'Photo ownership, publication, moderation, storage and deletion state are managed by FRAME'
      using errcode = '42501';
  end if;
  return new;
end;
$function$;

drop trigger if exists frame_guard_photo_owner_updates on public.photos;
create trigger frame_guard_photo_owner_updates before update on public.photos
for each row execute function public.frame_guard_photo_owner_updates();

create or replace function public.frame_profile_connections(p_user_id uuid, p_kind text)
returns table(user_id uuid, display_name text)
language plpgsql security definer set search_path = public, pg_temp
as $function$
declare
  v_hide_followers boolean;
  v_is_owner_or_admin boolean := false;
begin
  if p_user_id is null then raise exception 'user id required' using errcode = '22023'; end if;
  if p_kind not in ('followers', 'following') then raise exception 'invalid connection kind' using errcode = '22023'; end if;
  select coalesce(pr.hide_followers, false) into v_hide_followers
    from public.profiles pr where pr.user_id = p_user_id;
  if not found then return; end if;
  if auth.uid() is not null then
    select auth.uid() = p_user_id or exists (
      select 1 from public.gallery_admins ga where ga.user_id = auth.uid()
    ) into v_is_owner_or_admin;
  end if;
  if v_hide_followers and not v_is_owner_or_admin then
    raise exception 'profile connections are private' using errcode = '42501';
  end if;
  if p_kind = 'followers' then
    return query select f.follower_id, pr.display_name
      from public.follows f left join public.profiles pr on pr.user_id = f.follower_id
      where f.following_id = p_user_id;
  else
    return query select f.following_id, pr.display_name
      from public.follows f left join public.profiles pr on pr.user_id = f.following_id
      where f.follower_id = p_user_id;
  end if;
end;
$function$;

revoke all on function public.frame_profile_connections(uuid, text) from public;
grant execute on function public.frame_profile_connections(uuid, text) to anon, authenticated;

create index if not exists frame_photo_comments_photo_id_idx on public.photo_comments(photo_id);
create index if not exists frame_notifications_photo_id_idx on public.notifications(photo_id);
create index if not exists frame_follows_following_id_idx on public.follows(following_id);

commit;

-- Validate all client update/delete calls and test on staging before production.
