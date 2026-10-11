-- Correct the Scan-to-Find allowlist check to rely on the documented can_match flag.
-- Review this migration against the connected project's schema before applying it.
create or replace function public.scan_match_dolls(
  p_query extensions.vector(512),
  p_max_distance double precision default 0.28,
  p_limit integer default 5
)
returns table (
  person_id uuid,
  name text,
  photo_url text,
  faculty text,
  distance double precision
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_allowed boolean := false;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select coalesce(sa.can_match, false)
    into v_allowed
    from public.scan_allowlist sa
   where sa.user_id = v_user_id;

  if not coalesce(v_allowed, false) then
    raise exception 'not_allowed';
  end if;

  if p_query is null
     or p_max_distance is null
     or p_max_distance < 0
     or p_max_distance > 2 then
    raise exception 'invalid_input';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 20 then
    p_limit := 5;
  end if;

  if (
    select count(*)
      from public.scan_events
     where user_id = v_user_id
       and created_at > now() - interval '1 minute'
  ) >= 10 then
    insert into public.scan_events(user_id, event_type)
    values (v_user_id, 'rate_limited');
    raise exception 'rate_limited';
  end if;

  insert into public.scan_events(user_id, event_type)
  values (v_user_id, 'match');

  return query
  select
    p.id,
    p.name,
    p.photo_url,
    p.faculty,
    (ri.embedding <=> p_query)::double precision
  from public.scan_reference_index ri
  join public.people p on p.id = ri.person_id
  where ri.status = 'ready'
    and ri.embedding is not null
    and p.photo_url is not null
    and (ri.embedding <=> p_query) <= p_max_distance
  order by ri.embedding <=> p_query
  limit p_limit;
end;
$$;

revoke all on function public.scan_match_dolls(extensions.vector, double precision, integer) from public, anon;
grant execute on function public.scan_match_dolls(extensions.vector, double precision, integer) to authenticated;
