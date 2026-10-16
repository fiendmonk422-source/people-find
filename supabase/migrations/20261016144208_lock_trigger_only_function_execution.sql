begin;

revoke all on function public.notify_published_announcement() from public, anon, authenticated;
revoke all on function public.notify_request_reply() from public, anon, authenticated;
revoke all on function public.notify_request_status_change() from public, anon, authenticated;
revoke all on function public.notify_response_reaction() from public, anon, authenticated;
revoke all on function public.student_activity_set_email() from public, anon, authenticated;

commit;
