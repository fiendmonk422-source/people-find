begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('announcement-images', 'announcement-images', true, 5242880, array['image/png','image/jpeg','image/webp','image/avif'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view announcement images" on storage.objects;
create policy "Public can view announcement images" on storage.objects for select to public using (bucket_id = 'announcement-images');

drop policy if exists "Admins can upload announcement images" on storage.objects;
create policy "Admins can upload announcement images" on storage.objects for insert to authenticated
with check (bucket_id = 'announcement-images' and exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role in ('admin','super_admin')));

drop policy if exists "Admins can update announcement images" on storage.objects;
create policy "Admins can update announcement images" on storage.objects for update to authenticated
using (bucket_id = 'announcement-images' and exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role in ('admin','super_admin')))
with check (bucket_id = 'announcement-images' and exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role in ('admin','super_admin')));

drop policy if exists "Admins can delete announcement images" on storage.objects;
create policy "Admins can delete announcement images" on storage.objects for delete to authenticated
using (bucket_id = 'announcement-images' and exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role in ('admin','super_admin')));

commit;