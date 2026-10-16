begin;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  notification_type text not null check (notification_type in ('request_reply','request_status','response_reaction','announcement')),
  title text not null,
  body text not null default '',
  href text not null default '/dashboard',
  related_request_id uuid references public.requests(id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists notifications_recipient_created_idx on public.notifications(recipient_user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications(recipient_user_id, created_at desc) where read_at is null;
alter table public.notifications enable row level security;
revoke all on public.notifications from public, anon;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
drop policy if exists notifications_read_own on public.notifications;
create policy notifications_read_own on public.notifications for select to authenticated using (recipient_user_id = (select auth.uid()));
drop policy if exists notifications_mark_own_read on public.notifications;
create policy notifications_mark_own_read on public.notifications for update to authenticated using (recipient_user_id = (select auth.uid())) with check (recipient_user_id = (select auth.uid()));

create or replace function public.notify_request_reply()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_owner uuid; v_target text;
begin
  select r.user_id, r.target_name into v_owner, v_target from public.requests r where r.id = new.request_id;
  if v_owner is not null and v_owner <> new.user_id then
    insert into public.notifications(recipient_user_id, actor_user_id, notification_type, title, body, href, related_request_id)
    values (v_owner, new.user_id, 'request_reply', 'Your request received a reply',
      case when nullif(btrim(v_target), '') is null then left(coalesce(new.response, 'A student replied to your request.'), 140)
      else 'Someone replied to your request about ' || v_target || '.' end,
      '/requests', new.request_id);
  end if;
  return new;
end; $$;

drop trigger if exists request_reply_notification on public.request_responses;
create trigger request_reply_notification after insert on public.request_responses
for each row execute function public.notify_request_reply();

create or replace function public.notify_request_status_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status and new.user_id is not null and (auth.uid() is null or auth.uid() <> new.user_id) then
    insert into public.notifications(recipient_user_id, actor_user_id, notification_type, title, body, href, related_request_id)
    values (new.user_id, auth.uid(), 'request_status', 'Request status updated',
      'Your request is now ' || coalesce(new.status, 'updated') || '.',
      '/requests', new.id);
  end if;
  return new;
end; $$;

drop trigger if exists request_status_notification on public.requests;
create trigger request_status_notification after update of status on public.requests
for each row execute function public.notify_request_status_change();

create or replace function public.notify_response_reaction()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_owner uuid; v_request uuid;
begin
  select rr.user_id, rr.request_id into v_owner, v_request from public.request_responses rr where rr.id = new.response_id;
  if v_owner is not null and v_owner <> new.user_id then
    insert into public.notifications(recipient_user_id, actor_user_id, notification_type, title, body, href, related_request_id)
    values (v_owner, new.user_id, 'response_reaction', 'Someone reacted to your response',
      case when new.vote = 'up' then 'A student liked your response.' else 'A student marked your response as not helpful.' end,
      '/requests', v_request);
  end if;
  return new;
end; $$;

drop trigger if exists response_reaction_notification on public.response_feedback;
create trigger response_reaction_notification after insert or update of vote on public.response_feedback
for each row execute function public.notify_response_reaction();


create or replace function public.notify_published_announcement()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'published' and (
    tg_op = 'INSERT'
    or old.status is distinct from 'published'
    or old.title is distinct from new.title
    or old.body is distinct from new.body
  ) then
    insert into public.notifications(recipient_user_id, actor_user_id, notification_type, title, body, href)
    select u.id, new.created_by, 'announcement', 'New campus update: ' || new.title,
      left(new.body, 180), '/announcements'
    from auth.users u
    where u.id is distinct from new.created_by;
  end if;
  return new;
end; $;

drop trigger if exists published_announcement_notification on public.site_announcements;
create trigger published_announcement_notification
after insert or update of status, title, body on public.site_announcements
for each row execute function public.notify_published_announcement();

commit;