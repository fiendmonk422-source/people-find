begin;

create table if not exists public.student_activity_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('page_view','directory_search','profile_view','request_created','response_created','reaction_created')),
  page_path text not null default '/',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists student_activity_created_at_idx on public.student_activity_log(created_at desc);
create index if not exists student_activity_user_created_idx on public.student_activity_log(user_id, created_at desc);
create index if not exists student_activity_type_created_idx on public.student_activity_log(event_type, created_at desc);
alter table public.student_activity_log enable row level security;
revoke all on table public.student_activity_log from PUBLIC, anon, authenticated;
grant select, insert on table public.student_activity_log to authenticated;
create policy student_activity_insert_own on public.student_activity_log for insert to authenticated with check (user_id = (select auth.uid()));
create policy student_activity_select_own on public.student_activity_log for select to authenticated using (user_id = (select auth.uid()));
create policy student_activity_select_admin on public.student_activity_log for select to authenticated using (exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role in ('admin','super_admin')));

create or replace function public.admin_import_people(p_rows jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_row jsonb;
  v_person public.people%rowtype;
  v_inserted integer := 0;
  v_skipped integer := 0;
  v_rejected integer := 0;
  v_actor uuid := auth.uid();
  v_email text;
begin
  if v_actor is null or not exists (select 1 from public.user_roles ur where ur.user_id = v_actor and ur.role in ('admin','super_admin')) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 5000 then
    raise exception 'Provide a CSV containing no more than 5000 rows' using errcode = '22023';
  end if;
  select u.email into v_email from auth.users u where u.id = v_actor;
  for v_row in select value from jsonb_array_elements(p_rows) loop
    begin
      v_person := jsonb_populate_record(null::public.people, v_row);
      if nullif(btrim(v_person.name), '') is null then
        v_rejected := v_rejected + 1;
        continue;
      end if;
      if nullif(btrim(v_person.matric_number), '') is not null and exists (
        select 1 from public.people p
        where lower(btrim(p.matric_number)) = lower(btrim(v_person.matric_number))
          and coalesce(lower(btrim(p.school)), '') = coalesce(lower(btrim(v_person.school)), '')
      ) then
        v_skipped := v_skipped + 1;
        continue;
      end if;
      insert into public.people (
        name, first_name, middle_name, last_name, nickname, school, faculty, department,
        level, class_name, matric_number, hostel, room, phone, email, address, date_of_birth,
        gender, state, country, nationality, admission_year, graduation_year, status,
        photo_url, lga, level_override, profile_verified, profile_visibility
      ) values (
        btrim(v_person.name), nullif(btrim(v_person.first_name), ''), nullif(btrim(v_person.middle_name), ''),
        nullif(btrim(v_person.last_name), ''), nullif(btrim(v_person.nickname), ''),
        nullif(btrim(v_person.school), ''), nullif(btrim(v_person.faculty), ''), nullif(btrim(v_person.department), ''),
        nullif(btrim(v_person.level), ''), nullif(btrim(v_person.class_name), ''), nullif(btrim(v_person.matric_number), ''),
        nullif(btrim(v_person.hostel), ''), nullif(btrim(v_person.room), ''), nullif(btrim(v_person.phone), ''),
        nullif(btrim(v_person.email), ''), nullif(btrim(v_person.address), ''), v_person.date_of_birth,
        nullif(btrim(v_person.gender), ''), nullif(btrim(v_person.state), ''), nullif(btrim(v_person.country), ''),
        nullif(btrim(v_person.nationality), ''), nullif(btrim(v_person.admission_year), ''),
        nullif(btrim(v_person.graduation_year), ''), nullif(btrim(v_person.status), ''),
        nullif(btrim(v_person.photo_url), ''), nullif(btrim(v_person.lga), ''),
        nullif(btrim(v_person.level_override), ''), coalesce(v_person.profile_verified, false),
        coalesce(nullif(btrim(v_person.profile_visibility), ''), 'public')
      );
      v_inserted := v_inserted + 1;
    exception when others then
      v_rejected := v_rejected + 1;
    end;
  end loop;
  insert into public.admin_activity_log(actor_user_id, actor_email, action, target_type, summary, details)
  values (v_actor, v_email, 'csv_import', 'people', 'CSV directory import completed',
    jsonb_build_object('inserted', v_inserted, 'skipped_duplicates', v_skipped, 'rejected', v_rejected, 'submitted', jsonb_array_length(p_rows)));
  return jsonb_build_object('inserted', v_inserted, 'skipped_duplicates', v_skipped, 'rejected', v_rejected, 'submitted', jsonb_array_length(p_rows));
end;
$$;
revoke all on function public.admin_import_people(jsonb) from PUBLIC, anon;
grant execute on function public.admin_import_people(jsonb) to authenticated;
commit;