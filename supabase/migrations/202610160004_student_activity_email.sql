alter table public.student_activity_log add column if not exists user_email text;

create or replace function public.student_activity_set_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select u.email into new.user_email from auth.users u where u.id = new.user_id;
  return new;
end;
$$;
drop trigger if exists student_activity_set_email_trigger on public.student_activity_log;
create trigger student_activity_set_email_trigger before insert on public.student_activity_log
for each row execute function public.student_activity_set_email();