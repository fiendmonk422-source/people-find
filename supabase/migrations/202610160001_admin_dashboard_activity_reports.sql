begin;

-- Cohort/admission labels may be ranges such as 2023/2024, so preserve them as text.
alter table public.people
  alter column admission_year type text using admission_year::text,
  alter column graduation_year type text using graduation_year::text;

-- Administrator assignments are managed only through the Supabase Dashboard/SQL Editor.
-- Authenticated users can read their own role, but cannot grant or change roles themselves.
create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'super_admin')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

alter table public.user_roles enable row level security;
revoke all on table public.user_roles from PUBLIC, anon, authenticated;
grant select on table public.user_roles to authenticated;

drop policy if exists user_roles_select_own on public.user_roles;
create policy user_roles_select_own
  on public.user_roles
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create table if not exists public.admin_activity_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null,
  target_type text not null,
  target_id text,
  summary text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_activity_log_created_at_idx
  on public.admin_activity_log (created_at desc);
create index if not exists admin_activity_log_action_created_idx
  on public.admin_activity_log (action, created_at desc);

alter table public.admin_activity_log enable row level security;
revoke all on table public.admin_activity_log from PUBLIC, anon, authenticated;
grant select on table public.admin_activity_log to authenticated;

drop policy if exists admin_activity_log_select_admin on public.admin_activity_log;
create policy admin_activity_log_select_admin
  on public.admin_activity_log
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_roles ur
      where ur.user_id = (select auth.uid())
        and ur.role in ('admin', 'super_admin')
    )
  );

-- Prevent client-side edits that could bypass the audited admin RPC.
-- Imports and database maintenance can still be performed by a trusted database administrator.
revoke update on table public.people from PUBLIC, anon, authenticated;
revoke update on table public.requests from PUBLIC, anon, authenticated;

-- Replace permissive write policies with owner-bound insert rules.
drop policy if exists "Authenticated users can create requests" on public.requests;
create policy requests_insert_own
  on public.requests
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Authenticated users can update requests" on public.requests;

drop policy if exists "Authenticated users can create responses" on public.request_responses;
create policy request_responses_insert_own
  on public.request_responses
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- Permissive policies combine with OR, so remove the old unrestricted feedback insert.
drop policy if exists "Authenticated users can create feedback" on public.response_feedback;
drop policy if exists "Authenticated users can insert response feedback" on public.response_feedback;
create policy response_feedback_insert_own
  on public.response_feedback
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- These two read policies did the same thing; keep one to avoid duplicate policy work.
drop policy if exists "Authenticated users can view feedback" on public.response_feedback;

-- SECURITY DEFINER is deliberately used only for these narrow, audited actions.
-- Each function checks auth.uid() against the protected role table, has a fixed search_path,
-- accepts an explicit allowlist of fields/statuses, and writes the audit event in the same transaction.
create or replace function public.admin_update_person(
  p_person_id uuid,
  p_changes jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor_id uuid := auth.uid();
  v_actor_email text;
  v_fields text[];
  v_person public.people%rowtype;
begin
  if v_actor_id is null or not exists (
    select 1
    from public.user_roles ur
    where ur.user_id = v_actor_id
      and ur.role in ('admin', 'super_admin')
  ) then
    raise exception 'admin_access_required' using errcode = '42501';
  end if;

  if p_changes is null or jsonb_typeof(p_changes) <> 'object' or p_changes = '{}'::jsonb then
    raise exception 'changes_must_be_a_non_empty_object' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_object_keys(p_changes) as entry(key)
    where entry.key <> all (array[
      'name', 'first_name', 'middle_name', 'last_name', 'nickname',
      'school', 'faculty', 'department', 'level', 'class_name', 'matric_number',
      'hostel', 'room', 'phone', 'email', 'address', 'date_of_birth', 'gender',
      'state', 'country', 'nationality', 'admission_year', 'graduation_year',
      'status', 'photo_url', 'lga', 'level_override', 'profile_verified',
      'profile_visibility'
    ]::text[])
  ) then
    raise exception 'unsupported_person_field' using errcode = '22023';
  end if;

  select array_agg(entry.key order by entry.key)
    into v_fields
    from jsonb_object_keys(p_changes) as entry(key);

  update public.people as p
  set
    name = case when p_changes ? 'name' then nullif(p_changes->>'name', '') else p.name end,
    first_name = case when p_changes ? 'first_name' then nullif(p_changes->>'first_name', '') else p.first_name end,
    middle_name = case when p_changes ? 'middle_name' then nullif(p_changes->>'middle_name', '') else p.middle_name end,
    last_name = case when p_changes ? 'last_name' then nullif(p_changes->>'last_name', '') else p.last_name end,
    nickname = case when p_changes ? 'nickname' then nullif(p_changes->>'nickname', '') else p.nickname end,
    school = case when p_changes ? 'school' then nullif(p_changes->>'school', '') else p.school end,
    faculty = case when p_changes ? 'faculty' then nullif(p_changes->>'faculty', '') else p.faculty end,
    department = case when p_changes ? 'department' then nullif(p_changes->>'department', '') else p.department end,
    level = case when p_changes ? 'level' then nullif(p_changes->>'level', '') else p.level end,
    class_name = case when p_changes ? 'class_name' then nullif(p_changes->>'class_name', '') else p.class_name end,
    matric_number = case when p_changes ? 'matric_number' then nullif(p_changes->>'matric_number', '') else p.matric_number end,
    hostel = case when p_changes ? 'hostel' then nullif(p_changes->>'hostel', '') else p.hostel end,
    room = case when p_changes ? 'room' then nullif(p_changes->>'room', '') else p.room end,
    phone = case when p_changes ? 'phone' then nullif(p_changes->>'phone', '') else p.phone end,
    email = case when p_changes ? 'email' then nullif(p_changes->>'email', '') else p.email end,
    address = case when p_changes ? 'address' then nullif(p_changes->>'address', '') else p.address end,
    date_of_birth = case when p_changes ? 'date_of_birth' then nullif(p_changes->>'date_of_birth', '')::date else p.date_of_birth end,
    gender = case when p_changes ? 'gender' then nullif(p_changes->>'gender', '') else p.gender end,
    state = case when p_changes ? 'state' then nullif(p_changes->>'state', '') else p.state end,
    country = case when p_changes ? 'country' then nullif(p_changes->>'country', '') else p.country end,
    nationality = case when p_changes ? 'nationality' then nullif(p_changes->>'nationality', '') else p.nationality end,
    admission_year = case when p_changes ? 'admission_year' then nullif(p_changes->>'admission_year', '') else p.admission_year end,
    graduation_year = case when p_changes ? 'graduation_year' then nullif(p_changes->>'graduation_year', '') else p.graduation_year end,
    status = case when p_changes ? 'status' then nullif(p_changes->>'status', '') else p.status end,
    photo_url = case when p_changes ? 'photo_url' then nullif(p_changes->>'photo_url', '') else p.photo_url end,
    lga = case when p_changes ? 'lga' then nullif(p_changes->>'lga', '') else p.lga end,
    level_override = case when p_changes ? 'level_override' then nullif(p_changes->>'level_override', '') else p.level_override end,
    profile_verified = case when p_changes ? 'profile_verified' then (p_changes->>'profile_verified')::boolean else p.profile_verified end,
    profile_visibility = case when p_changes ? 'profile_visibility' then nullif(p_changes->>'profile_visibility', '') else p.profile_visibility end,
    updated_at = now()
  where p.id = p_person_id
  returning p.* into v_person;

  if not found then
    raise exception 'person_not_found' using errcode = 'P0002';
  end if;

  select u.email into v_actor_email
    from auth.users u
    where u.id = v_actor_id;

  insert into public.admin_activity_log (
    actor_user_id, actor_email, action, target_type, target_id, summary, details
  ) values (
    v_actor_id,
    v_actor_email,
    'person.updated',
    'person',
    v_person.id::text,
    'Updated directory record ' || coalesce(nullif(v_person.name, ''), v_person.id::text) || '.',
    jsonb_build_object('fields', to_jsonb(v_fields))
  );

  return jsonb_build_object(
    'id', v_person.id,
    'name', v_person.name,
    'school', v_person.school,
    'faculty', v_person.faculty,
    'department', v_person.department,
    'level', v_person.level,
    'matric_number', v_person.matric_number,
    'updated_at', v_person.updated_at
  );
end;
$function$;

revoke all on function public.admin_update_person(uuid, jsonb) from PUBLIC, anon;
grant execute on function public.admin_update_person(uuid, jsonb) to authenticated;

create or replace function public.admin_update_request_status(
  p_request_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor_id uuid := auth.uid();
  v_actor_email text;
  v_old_status text;
  v_new_status text;
  v_target_name text;
begin
  if v_actor_id is null or not exists (
    select 1
    from public.user_roles ur
    where ur.user_id = v_actor_id
      and ur.role in ('admin', 'super_admin')
  ) then
    raise exception 'admin_access_required' using errcode = '42501';
  end if;

  if lower(trim(coalesce(p_status, ''))) not in ('open', 'resolved', 'closed') then
    raise exception 'invalid_request_status' using errcode = '22023';
  end if;

  v_new_status := case lower(trim(p_status))
    when 'open' then 'Open'
    when 'resolved' then 'Resolved'
    when 'closed' then 'Closed'
  end;

  select r.status, r.target_name
    into v_old_status, v_target_name
    from public.requests r
    where r.id = p_request_id
    for update;

  if not found then
    raise exception 'request_not_found' using errcode = 'P0002';
  end if;

  update public.requests r
    set status = v_new_status
    where r.id = p_request_id;

  select u.email into v_actor_email
    from auth.users u
    where u.id = v_actor_id;

  insert into public.admin_activity_log (
    actor_user_id, actor_email, action, target_type, target_id, summary, details
  ) values (
    v_actor_id,
    v_actor_email,
    'request.status_changed',
    'request',
    p_request_id::text,
    'Changed request status from ' || coalesce(v_old_status, '(empty)') || ' to ' || v_new_status || '.',
    jsonb_build_object('from', v_old_status, 'to', v_new_status, 'target_name', v_target_name)
  );

  return jsonb_build_object(
    'id', p_request_id,
    'status', v_new_status,
    'previous_status', v_old_status
  );
end;
$function$;

revoke all on function public.admin_update_request_status(uuid, text) from PUBLIC, anon;
grant execute on function public.admin_update_request_status(uuid, text) to authenticated;

commit;
