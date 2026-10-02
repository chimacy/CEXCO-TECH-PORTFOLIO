-- CEXCO TECHNOLOGIES — core schema
create extension if not exists pgcrypto;

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ───────── profiles / roles ─────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'ADMIN' check (role in ('SUPER_ADMIN','ADMIN')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.current_role_name() returns text
language sql stable security definer set search_path = public as
$$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.profiles where id = auth.uid() and role in ('SUPER_ADMIN','ADMIN')) $$;

create or replace function public.is_super_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'SUPER_ADMIN') $$;

-- Run in the SQL editor AFTER creating the user in Supabase Auth:
--   select public.make_admin('you@example.com', 'SUPER_ADMIN');
create or replace function public.make_admin(p_email text, p_role text default 'ADMIN') returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if p_role not in ('SUPER_ADMIN','ADMIN') then raise exception 'invalid role'; end if;
  select id into uid from auth.users where lower(email) = lower(p_email);
  if uid is null then raise exception 'No auth user with email %', p_email; end if;
  insert into public.profiles (id, email, role) values (uid, p_email, p_role)
  on conflict (id) do update set role = excluded.role;
end $$;
revoke all on function public.make_admin(text, text) from public, anon, authenticated;

-- ───────── site settings (single row) ─────────
create table public.site_settings (
  id int primary key default 1 check (id = 1),
  brand_name text not null default 'CEXCO TECHNOLOGIES',
  logo_url text, favicon_url text,
  tagline text, short_description text, about_description text,
  email text, phone text, whatsapp text, address text, business_hours text,
  social_links jsonb not null default '{}'::jsonb,
  currency text not null default '₦',
  seo_title text, seo_description text, og_image_url text,
  footer_text text, copyright_text text,
  maintenance_mode boolean not null default false,
  default_layout text not null default 'masonry' check (default_layout in ('masonry','grid')),
  items_per_page int not null default 12 check (items_per_page between 3 and 60),
  default_contact_message text,
  updated_at timestamptz not null default now()
);
create trigger trg_settings_upd before update on public.site_settings for each row execute function set_updated_at();

-- ───────── content ─────────
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null, slug text not null unique,
  description text, image_url text,
  is_published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null, slug text not null unique,
  short_description text, description text,
  starting_price numeric(12,2), price_label text, cover_image_url text,
  category_id uuid references public.categories(id) on delete set null,
  featured boolean not null default false,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  sort_order int not null default 0, is_sample boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.pricing_items (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references public.services(id) on delete set null,
  title text not null, description text,
  price numeric(12,2), currency text not null default '₦', price_label text,
  features text[] not null default '{}',
  featured boolean not null default false, is_published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.portfolio_projects (
  id uuid primary key default gen_random_uuid(),
  title text not null, slug text not null unique,
  short_description text, description text,
  category_id uuid references public.categories(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  client_name text, client_type text,
  price numeric(12,2), price_label text,
  cover_image_url text,
  featured boolean not null default false,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  sort_order int not null default 0, view_count int not null default 0, is_sample boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.portfolio_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.portfolio_projects(id) on delete cascade,
  image_url text not null, alt_text text, sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  client_name text not null, role_company text, photo_url text, quote text not null,
  project_id uuid references public.portfolio_projects(id) on delete set null,
  is_published boolean not null default true, featured boolean not null default false,
  sort_order int not null default 0, is_sample boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.homepage_sections (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text, subtitle text, description text, cta_text text, cta_link text,
  is_visible boolean not null default true, sort_order int not null default 0,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table public.pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique, title text not null,
  heading text, intro text, body text, mission text, vision text,
  values_list text[] not null default '{}', image_url text,
  seo_title text, seo_description text,
  updated_at timestamptz not null default now()
);
create table public.stats (
  id uuid primary key default gen_random_uuid(),
  value text not null, label text not null,
  sort_order int not null default 0, is_published boolean not null default true
);
create table public.process_steps (
  id uuid primary key default gen_random_uuid(),
  step_number text, title text not null, description text,
  sort_order int not null default 0, is_published boolean not null default true
);

-- ───────── clients & requests ─────────
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null, email text, phone text, whatsapp text, company text, notes text,
  request_count int not null default 0, completed_count int not null default 0,
  last_request_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index clients_email_uniq on public.clients (lower(email)) where email is not null;

create table public.request_counters (period text primary key, last_value int not null default 0);

create table public.design_requests (
  id uuid primary key default gen_random_uuid(),
  reference_no text not null unique,
  upload_token uuid not null default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  full_name text not null, email text not null, whatsapp text, phone text, company text,
  service_id uuid references public.services(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  project_title text not null, description text not null,
  preferred_size text, deadline date, budget text, reference_links text, additional_notes text,
  status text not null default 'new' check (status in ('new','reviewing','quoted','approved','in_progress','revision','completed','cancelled')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  quoted_price numeric(12,2), final_price numeric(12,2),
  client_note text, archived boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.request_files (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.design_requests(id) on delete cascade,
  storage_path text not null, file_name text not null, mime_type text, size_bytes bigint,
  created_at timestamptz not null default now()
);
create table public.request_notes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.design_requests(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  author_email text, note text not null,
  created_at timestamptz not null default now()
);
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null, email text not null, phone text, subject text, message text not null,
  is_read boolean not null default false, created_at timestamptz not null default now()
);
create table public.media (
  id uuid primary key default gen_random_uuid(),
  bucket text not null default 'media', storage_path text not null unique,
  url text not null, file_name text not null, mime_type text, size_bytes bigint,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create table public.analytics_events (
  id bigint generated always as identity primary key,
  event_type text not null check (event_type in ('portfolio_view','project_view','service_view','category_view','request_submitted')),
  entity_id uuid, created_at timestamptz not null default now()
);

-- updated_at triggers
do $$ declare t text; begin
  foreach t in array array['profiles','categories','services','pricing_items','portfolio_projects','testimonials','homepage_sections','pages','clients','design_requests'] loop
    execute format('create trigger trg_%1$s_upd before update on public.%1$s for each row execute function set_updated_at()', t);
  end loop; end $$;

-- indexes
create index on public.portfolio_projects (status, sort_order);
create index on public.portfolio_projects (category_id);
create index on public.portfolio_projects (service_id);
create index on public.portfolio_projects (featured) where featured;
create index on public.portfolio_images (project_id, sort_order);
create index on public.services (status, sort_order);
create index on public.design_requests (status, created_at desc);
create index on public.design_requests (client_id);
create index on public.request_files (request_id);
create index on public.request_notes (request_id);
create index on public.analytics_events (event_type, created_at desc);

-- ───────── public RPCs ─────────
create or replace function public.submit_design_request(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_period text := to_char(now(), 'YYYYMM'); v_n int; v_ref text; v_client uuid; v_id uuid; v_token uuid;
  v_email text := lower(trim(p->>'email'));
begin
  if coalesce(trim(p->>'full_name'),'') = '' or coalesce(trim(p->>'project_title'),'') = ''
     or coalesce(trim(p->>'description'),'') = '' or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Missing or invalid required fields';
  end if;
  if length(p->>'description') > 5000 or length(p->>'full_name') > 200 then raise exception 'Input too long'; end if;

  insert into request_counters (period, last_value) values (v_period, 1)
    on conflict (period) do update set last_value = request_counters.last_value + 1 returning last_value into v_n;
  v_ref := 'CEXCO-REQ-' || v_period || '-' || lpad(v_n::text, 4, '0');

  insert into clients (name, email, phone, whatsapp, company, request_count, last_request_at)
  values (trim(p->>'full_name'), v_email, nullif(p->>'phone',''), nullif(p->>'whatsapp',''), nullif(p->>'company',''), 1, now())
  on conflict (lower(email)) where email is not null do update set
    name = excluded.name,
    phone = coalesce(excluded.phone, clients.phone), whatsapp = coalesce(excluded.whatsapp, clients.whatsapp),
    company = coalesce(excluded.company, clients.company),
    request_count = clients.request_count + 1, last_request_at = now()
  returning id into v_client;

  insert into design_requests (reference_no, client_id, full_name, email, whatsapp, phone, company, service_id, category_id,
    project_title, description, preferred_size, deadline, budget, reference_links, additional_notes)
  values (v_ref, v_client, trim(p->>'full_name'), v_email, nullif(p->>'whatsapp',''), nullif(p->>'phone',''), nullif(p->>'company',''),
    nullif(p->>'service_id','')::uuid, nullif(p->>'category_id','')::uuid,
    trim(p->>'project_title'), trim(p->>'description'), nullif(p->>'preferred_size',''), nullif(p->>'deadline','')::date,
    nullif(p->>'budget',''), nullif(p->>'reference_links',''), nullif(p->>'additional_notes',''))
  returning id, upload_token into v_id, v_token;

  insert into analytics_events (event_type, entity_id) values ('request_submitted', nullif(p->>'service_id','')::uuid);
  return jsonb_build_object('id', v_id, 'reference_no', v_ref, 'upload_token', v_token);
end $$;

create or replace function public.add_request_file(p_request uuid, p_token uuid, p_path text, p_name text, p_mime text, p_size bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from design_requests where id = p_request and upload_token = p_token and created_at > now() - interval '2 hours') then
    raise exception 'Invalid upload token';
  end if;
  if p_path not like p_request::text || '/%' then raise exception 'Invalid path'; end if;
  if (select count(*) from request_files where request_id = p_request) >= 10 then raise exception 'Too many files'; end if;
  insert into request_files (request_id, storage_path, file_name, mime_type, size_bytes) values (p_request, p_path, left(p_name, 200), p_mime, p_size);
end $$;

create or replace function public.submit_contact_message(p jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(trim(p->>'name'),'') = '' or coalesce(trim(p->>'message'),'') = ''
     or lower(trim(p->>'email')) !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Missing or invalid fields'; end if;
  if length(p->>'message') > 5000 then raise exception 'Message too long'; end if;
  insert into contact_messages (name, email, phone, subject, message)
  values (trim(p->>'name'), lower(trim(p->>'email')), nullif(p->>'phone',''), nullif(p->>'subject',''), trim(p->>'message'));
end $$;

create or replace function public.track_event(p_type text, p_entity uuid default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_type not in ('portfolio_view','project_view','service_view','category_view') then return; end if;
  insert into analytics_events (event_type, entity_id) values (p_type, p_entity);
  if p_type = 'project_view' and p_entity is not null then
    update portfolio_projects set view_count = view_count + 1 where id = p_entity and status = 'published';
  end if;
end $$;

grant execute on function public.submit_design_request(jsonb), public.add_request_file(uuid,uuid,text,text,text,bigint),
  public.submit_contact_message(jsonb), public.track_event(text,uuid) to anon, authenticated;

-- keep client completed_count in sync
create or replace function public.sync_client_completed() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.client_id is not null then
    update clients set completed_count = (select count(*) from design_requests where client_id = new.client_id and status = 'completed') where id = new.client_id;
  end if;
  return new;
end $$;
create trigger trg_req_completed after update of status on public.design_requests for each row execute function sync_client_completed();
