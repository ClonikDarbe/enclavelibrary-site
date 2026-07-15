-- Enclave public profiles and owner-only administration.
-- Run once in Supabase SQL Editor, then add your user id to enclave_admins.

alter table public.enclave_profiles add column if not exists bio text not null default '';
alter table public.enclave_profiles add column if not exists banner_url text not null default '';
alter table public.enclave_profiles add column if not exists is_public boolean not null default false;
create unique index if not exists enclave_profiles_username_ci_unique
on public.enclave_profiles (lower(username)) where username <> '';

create table if not exists public.enclave_admins (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.enclave_admins enable row level security;
revoke all on table public.enclave_admins from anon, authenticated;

create table if not exists public.enclave_announcements (
  id bigint generated always as identity primary key,
  title text not null,
  body text not null,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint enclave_announcement_title_length check (char_length(title) between 3 and 80),
  constraint enclave_announcement_body_length check (char_length(body) between 3 and 500)
);
alter table public.enclave_announcements enable row level security;
drop policy if exists "published announcements read" on public.enclave_announcements;
create policy "published announcements read" on public.enclave_announcements
for select to anon, authenticated using (is_published = true);
grant select on table public.enclave_announcements to anon, authenticated;

create or replace function public.update_enclave_public_profile(
  new_username text,
  new_bio text,
  new_avatar_url text,
  new_banner_url text,
  new_is_public boolean
) returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare owner_id uuid := auth.uid();
begin
  if owner_id is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if trim(new_username) !~ '^[[:alnum:]_.-]{3,24}$' then raise exception 'invalid_username'; end if;
  if char_length(coalesce(new_bio, '')) > 240 then raise exception 'bio_too_long'; end if;
  if coalesce(new_avatar_url, '') <> '' and new_avatar_url !~ '^https://' then raise exception 'invalid_avatar_url'; end if;
  if coalesce(new_banner_url, '') <> '' and new_banner_url !~ '^https://' then raise exception 'invalid_banner_url'; end if;

  insert into public.enclave_profiles (id, username, email, avatar_url, bio, banner_url, is_public, updated_at)
  values (owner_id, trim(new_username), coalesce(auth.jwt() ->> 'email', ''), coalesce(new_avatar_url, ''), coalesce(new_bio, ''), coalesce(new_banner_url, ''), coalesce(new_is_public, false), now())
  on conflict (id) do update set
    username = excluded.username,
    avatar_url = excluded.avatar_url,
    bio = excluded.bio,
    banner_url = excluded.banner_url,
    is_public = excluded.is_public,
    updated_at = now();
  return jsonb_build_object('ok', true, 'username', trim(new_username));
end;
$$;
revoke all on function public.update_enclave_public_profile(text,text,text,text,boolean) from public;
grant execute on function public.update_enclave_public_profile(text,text,text,text,boolean) to authenticated;

create or replace function public.get_public_enclave_profile(profile_username text)
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare profile_id uuid; result jsonb;
begin
  select id into profile_id from public.enclave_profiles
  where lower(username) = lower(trim(profile_username)) and is_public = true limit 1;
  if profile_id is null then return null; end if;

  select jsonb_build_object(
    'profile', jsonb_build_object('username', p.username, 'avatarUrl', p.avatar_url, 'bannerUrl', p.banner_url, 'bio', p.bio, 'updatedAt', p.updated_at),
    'stats', jsonb_build_object(
      'games', (select count(*) from public.enclave_web_library w where w.user_id = profile_id and not w.hidden_from_web),
      'minutes', (select coalesce(sum(playtime_minutes), 0) from public.enclave_web_library w where w.user_id = profile_id and not w.hidden_from_web),
      'platforms', (select count(distinct platform) from public.enclave_web_library w where w.user_id = profile_id and not w.hidden_from_web),
      'favorites', (select count(*) from public.enclave_web_library w where w.user_id = profile_id and not w.hidden_from_web and favorite)
    ),
    'games', coalesce((select jsonb_agg(to_jsonb(g)) from (
      select title, platform, cover_url as "coverUrl", banner_url as "bannerUrl", playtime_minutes as "playtimeMinutes", last_played as "lastPlayed"
      from public.enclave_web_library where user_id = profile_id and not hidden_from_web
      order by playtime_minutes desc, last_seen_at desc limit 24
    ) g), '[]'::jsonb)
  ) into result from public.enclave_profiles p where p.id = profile_id;
  return result;
end;
$$;
revoke all on function public.get_public_enclave_profile(text) from public;
grant execute on function public.get_public_enclave_profile(text) to anon, authenticated;

create or replace function public.admin_enclave_dashboard()
returns jsonb
language plpgsql stable security definer
set search_path = public, auth, pg_temp
as $$
declare owner_id uuid := auth.uid(); result jsonb;
begin
  if owner_id is null or not exists (select 1 from public.enclave_admins where id = owner_id) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'totalUsers', (select count(*) from auth.users),
    'activeSessions', (select count(*) from auth.sessions),
    'profileCount', (select count(*) from public.enclave_profiles),
    'syncedUsers', (select count(distinct user_id) from public.enclave_web_library),
    'totalGames', (select count(*) from public.enclave_web_library),
    'missingArtwork', (select count(*) from public.enclave_web_library where cover_url = '' and banner_url = '' and logo_url = ''),
    'lastSyncAt', (select max(last_seen_at) from public.enclave_web_library),
    'recentUsers', coalesce((select jsonb_agg(to_jsonb(u)) from (
      select id, email, created_at as "createdAt", last_sign_in_at as "lastSignInAt" from auth.users order by created_at desc limit 8
    ) u), '[]'::jsonb),
    'announcements', coalesce((select jsonb_agg(to_jsonb(a)) from (
      select id, title, body, is_published as "isPublished", created_at as "createdAt" from public.enclave_announcements order by created_at desc limit 10
    ) a), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;
revoke all on function public.admin_enclave_dashboard() from public;
grant execute on function public.admin_enclave_dashboard() to authenticated;

create or replace function public.admin_publish_enclave_announcement(announcement_title text, announcement_body text)
returns bigint
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare owner_id uuid := auth.uid(); announcement_id bigint;
begin
  if owner_id is null or not exists (select 1 from public.enclave_admins where id = owner_id) then raise exception 'admin_required' using errcode = '42501'; end if;
  if char_length(trim(announcement_title)) not between 3 and 80 or char_length(trim(announcement_body)) not between 3 and 500 then raise exception 'invalid_announcement'; end if;
  insert into public.enclave_announcements(title, body) values(trim(announcement_title), trim(announcement_body)) returning id into announcement_id;
  return announcement_id;
end;
$$;
revoke all on function public.admin_publish_enclave_announcement(text,text) from public;
grant execute on function public.admin_publish_enclave_announcement(text,text) to authenticated;

-- After running this file, grant yourself admin access with your real email:
-- insert into public.enclave_admins(id) select id from auth.users where email = 'YOUR_EMAIL';
