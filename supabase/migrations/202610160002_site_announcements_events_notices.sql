begin;

create table if not exists public.site_announcements (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('notice','event')),
  title text not null check (char_length(trim(title)) between 1 and 180),
  body text not null check (char_length(trim(body)) between 1 and 10000),
  event_date date,
  event_time text,
  venue text,
  image_url text,
  action_url text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  is_pinned boolean not null default false,
  show_popup boolean not null default false,
  published_at timestamptz,
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_date_required check (kind <> 'event' or event_date is not null)
);

create index if not exists site_announcements_public_idx
  on public.site_announcements (status, is_pinned desc, published_at desc);
create index if not exists site_announcements_expiry_idx
  on public.site_announcements (expires_at);

alter table public.site_announcements enable row level security;
revoke all on table public.site_announcements from PUBLIC, anon, authenticated;
grant select on table public.site_announcements to anon, authenticated;
grant insert, update, delete on table public.site_announcements to authenticated;

create policy site_announcements_public_read on public.site_announcements
for select to anon, authenticated
using (
  status = 'published'
  and (expires_at is null or expires_at > now())
  and (kind <> 'event' or event_date is null or event_date >= current_date)
);

create policy site_announcements_admin_read_all on public.site_announcements
for select to authenticated
using (exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role in ('admin','super_admin')));

create policy site_announcements_admin_insert on public.site_announcements
for insert to authenticated
with check (
  exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role in ('admin','super_admin'))
  and (created_by is null or created_by = (select auth.uid()))
);

create policy site_announcements_admin_update on public.site_announcements
for update to authenticated
using (exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role in ('admin','super_admin')))
with check (exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role in ('admin','super_admin')));

create policy site_announcements_admin_delete on public.site_announcements
for delete to authenticated
using (exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role in ('admin','super_admin')));

create or replace function public.site_announcements_touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger site_announcements_updated_at before update on public.site_announcements
for each row execute function public.site_announcements_touch_updated_at();

commit;
