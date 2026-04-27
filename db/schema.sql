-- Perchlead — Postgres schema for Neon.
-- Mirrors /types/index.ts. Ownership is enforced in the application layer
-- (every query joins on `owner_id = $current_user_id`); we deliberately don't
-- ship a built-in auth integration since Neon ≠ Supabase. Pair with Auth.js,
-- Clerk, Lucia, or your provider of choice.

-- Extensions ---------------------------------------------------------------
create extension if not exists "pgcrypto";
-- pgvector is staged for semantic search later; Neon supports it on all tiers.
create extension if not exists "vector";

-- Enums --------------------------------------------------------------------
do $$ begin
  create type lead_status as enum (
    'new','cleaned','enriched','qualified','contacted',
    'replied','converted','rejected','do_not_contact'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type source_type as enum (
    'csv','paste','manual','webhook','google_sheets','gumroad',
    'lemon_squeezy','paddle','appsumo','hubspot','smartlead','instantly',
    'lead_finder','other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type interest_level as enum ('low','medium','high');
exception when duplicate_object then null; end $$;

do $$ begin
  create type consent_basis as enum (
    'user_provided','purchase','newsletter_signup','form_submission',
    'manual_entry','public_directory','unknown'
  );
exception when duplicate_object then null; end $$;

-- Users --------------------------------------------------------------------
-- Wire your auth provider's user IDs into this table on first login.
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text,
  created_at timestamptz not null default now()
);

-- Companies ----------------------------------------------------------------
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  domain text,
  website text,
  industry text,
  size text,
  location text,
  description text,
  quality_score int,
  tech_stack text[],
  social_links_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists companies_owner_idx on public.companies(owner_id);
create index if not exists companies_domain_idx on public.companies(owner_id, domain);

-- Sources ------------------------------------------------------------------
create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  type source_type not null,
  name text not null,
  imported_at timestamptz not null default now(),
  raw_payload_json jsonb,
  confidence numeric(3,2) not null default 0.8,
  created_at timestamptz not null default now()
);
create index if not exists sources_owner_idx on public.sources(owner_id);

-- Products -----------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  description text,
  url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_owner_idx on public.products(owner_id);

-- Tags ---------------------------------------------------------------------
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  color text not null default '#3a6bff',
  created_at timestamptz not null default now()
);
create unique index if not exists tags_owner_name_idx on public.tags(owner_id, lower(name));

-- Suppressions -------------------------------------------------------------
create table if not exists public.suppressions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  email text,
  domain text,
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists suppressions_owner_idx on public.suppressions(owner_id);
create index if not exists suppressions_email_idx on public.suppressions(owner_id, email);
create index if not exists suppressions_domain_idx on public.suppressions(owner_id, domain);

-- Leads --------------------------------------------------------------------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  title text,
  company_id uuid references public.companies(id) on delete set null,
  website text,
  linkedin_url text,
  location text,
  status lead_status not null default 'new',
  score int not null default 0,
  score_reason jsonb,
  source_id uuid references public.sources(id) on delete set null,
  consent_basis consent_basis,
  is_suppressed boolean not null default false,
  notes text,
  search_tsv tsvector,
  -- staged for semantic search; nullable until embedding is computed.
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists leads_owner_idx on public.leads(owner_id);
create index if not exists leads_owner_email_idx on public.leads(owner_id, lower(email));
create index if not exists leads_owner_status_idx on public.leads(owner_id, status);
create index if not exists leads_owner_score_idx on public.leads(owner_id, score desc);
create index if not exists leads_search_idx on public.leads using gin (search_tsv);

create or replace function public.leads_search_tsv_update() returns trigger as $$
begin
  new.search_tsv :=
    setweight(to_tsvector('simple', coalesce(new.name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.email, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.title, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.location, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(new.notes, '')), 'C');
  new.updated_at := now();
  return new;
end $$ language plpgsql;

drop trigger if exists leads_tsv_update on public.leads;
create trigger leads_tsv_update
before insert or update on public.leads
for each row execute procedure public.leads_search_tsv_update();

-- Lead <-> tag join --------------------------------------------------------
create table if not exists public.lead_tags (
  lead_id uuid not null references public.leads(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (lead_id, tag_id)
);

-- Lead <-> product interest ------------------------------------------------
create table if not exists public.lead_product_interests (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  interest_level interest_level not null default 'medium',
  confidence numeric(3,2) not null default 0.8,
  reason text,
  source text,
  created_at timestamptz not null default now(),
  unique (lead_id, product_id)
);
create index if not exists lpi_product_idx on public.lead_product_interests(product_id);

-- Interactions / activity log ---------------------------------------------
create table if not exists public.interactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  type text not null,
  note text,
  happened_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists interactions_lead_idx on public.interactions(lead_id, happened_at desc);

-- Tasks --------------------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  title text not null,
  due_date timestamptz,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tasks_owner_status_idx on public.tasks(owner_id, status);
create index if not exists tasks_lead_idx on public.tasks(lead_id);

-- Saved lists --------------------------------------------------------------
create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  filters_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Imports ------------------------------------------------------------------
create table if not exists public.imports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  filename text not null,
  source_type source_type not null,
  status text not null default 'pending',
  total_rows int not null default 0,
  imported_count int not null default 0,
  duplicate_count int not null default 0,
  error_count int not null default 0,
  mapping_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.import_rows (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.imports(id) on delete cascade,
  raw_json jsonb not null,
  normalized_json jsonb,
  status text not null default 'pending',
  error text,
  duplicate_of uuid references public.leads(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Audit logs ---------------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  metadata_json jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_owner_idx on public.audit_logs(owner_id, created_at desc);

-- Notes:
-- 1. Ownership is enforced in app code. Every query must include
--    `where owner_id = $current_user_id`. A missed predicate is a security
--    bug — protect with code review and integration tests.
-- 2. If you want defense-in-depth, you can layer Postgres RLS using a
--    session variable: `SET LOCAL app.user_id = '<uuid>'` per request, then
--    `CREATE POLICY ... USING (owner_id::text = current_setting('app.user_id', true))`.
--    Skipped here to keep first-deploy simple.
-- 3. Vector dimension is 1536 to match OpenAI/Anthropic typical embeddings.
--    Change the column if you pick a different embedding size.
