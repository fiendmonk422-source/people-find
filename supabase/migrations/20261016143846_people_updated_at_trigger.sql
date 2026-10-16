begin;

create or replace function public.set_people_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.set_people_updated_at() from public, anon, authenticated;

drop trigger if exists people_set_updated_at on public.people;
create trigger people_set_updated_at
before update on public.people
for each row
execute function public.set_people_updated_at();

commit;
