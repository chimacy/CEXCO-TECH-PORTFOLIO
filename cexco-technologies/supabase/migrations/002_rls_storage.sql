-- CEXCO TECHNOLOGIES — Row Level Security + Storage policies

do $$ declare t text; begin
  foreach t in array array['profiles','site_settings','categories','services','pricing_items','portfolio_projects','portfolio_images',
    'testimonials','homepage_sections','pages','stats','process_steps','clients','request_counters','design_requests',
    'request_files','request_notes','contact_messages','media','analytics_events'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop; end $$;

-- profiles
create policy profiles_self_read on public.profiles for select to authenticated using (id = auth.uid() or public.is_super_admin());
create policy profiles_super_write on public.profiles for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

-- Public-readable content (published only) + admin write
create policy settings_public_read on public.site_settings for select to anon, authenticated using (true);
create policy settings_super_write on public.site_settings for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

create policy categories_public_read on public.categories for select to anon, authenticated using (is_published);
create policy categories_admin on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy services_public_read on public.services for select to anon, authenticated using (status = 'published');
create policy services_admin on public.services for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy pricing_public_read on public.pricing_items for select to anon, authenticated using (is_published);
create policy pricing_admin on public.pricing_items for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy projects_public_read on public.portfolio_projects for select to anon, authenticated using (status = 'published');
create policy projects_admin on public.portfolio_projects for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy images_public_read on public.portfolio_images for select to anon, authenticated
  using (exists (select 1 from public.portfolio_projects p where p.id = project_id and p.status = 'published'));
create policy images_admin on public.portfolio_images for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy testimonials_public_read on public.testimonials for select to anon, authenticated using (is_published);
create policy testimonials_admin on public.testimonials for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy sections_public_read on public.homepage_sections for select to anon, authenticated using (is_visible);
create policy sections_super_write on public.homepage_sections for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

create policy pages_public_read on public.pages for select to anon, authenticated using (true);
create policy pages_super_write on public.pages for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

create policy stats_public_read on public.stats for select to anon, authenticated using (is_published);
create policy stats_super_write on public.stats for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

create policy steps_public_read on public.process_steps for select to anon, authenticated using (is_published);
create policy steps_super_write on public.process_steps for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

-- Private / admin-only data (public inserts happen only through SECURITY DEFINER RPCs)
create policy clients_admin on public.clients for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy requests_admin on public.design_requests for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy request_files_admin on public.request_files for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy request_notes_admin on public.request_notes for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy contact_admin on public.contact_messages for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy media_admin on public.media for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy analytics_admin_read on public.analytics_events for select to authenticated using (public.is_admin());
-- request_counters: RLS enabled with no policies => inaccessible except via SECURITY DEFINER functions.

-- ───────── Storage ─────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('media', 'media', true, 10485760, array['image/jpeg','image/png','image/webp','image/gif','image/avif']),
  ('request-files', 'request-files', false, 15728640, array['image/jpeg','image/png','image/webp','application/pdf','image/svg+xml'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- helper so anonymous uploads can only target a freshly created request folder
create or replace function public.request_upload_allowed(folder text) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.design_requests where id::text = folder and created_at > now() - interval '2 hours') $$;
grant execute on function public.request_upload_allowed(text) to anon, authenticated;

create policy media_public_read on storage.objects for select to anon, authenticated using (bucket_id = 'media');
create policy media_admin_insert on storage.objects for insert to authenticated with check (bucket_id = 'media' and public.is_admin());
create policy media_admin_update on storage.objects for update to authenticated using (bucket_id = 'media' and public.is_admin());
create policy media_admin_delete on storage.objects for delete to authenticated using (bucket_id = 'media' and public.is_admin());

create policy reqfiles_anon_insert on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'request-files' and public.request_upload_allowed((storage.foldername(name))[1]));
create policy reqfiles_admin_read on storage.objects for select to authenticated using (bucket_id = 'request-files' and public.is_admin());
create policy reqfiles_admin_delete on storage.objects for delete to authenticated using (bucket_id = 'request-files' and public.is_admin());
