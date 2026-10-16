begin;
create or replace function public.update_own_request_status(p_request_id uuid, p_status text)
returns public.requests
language plpgsql
security definer
set search_path = ''
as $$
declare v_request public.requests%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  if p_status not in ('Open','Resolved') then
    raise exception 'Unsupported request status' using errcode = '22023';
  end if;
  update public.requests
    set status = p_status
    where id = p_request_id and user_id = auth.uid()
    returning * into v_request;
  if not found then
    raise exception 'Request not found or not owned by current user' using errcode = '42501';
  end if;
  return v_request;
end;
$$;
revoke all on function public.update_own_request_status(uuid,text) from public, anon;
grant execute on function public.update_own_request_status(uuid,text) to authenticated;
commit;