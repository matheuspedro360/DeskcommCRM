-- 0381: conexão nativa dos Formulários Instantâneos da Meta.
create table if not exists public.meta_lead_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  webhook_source_id uuid not null references public.webhook_sources(id) on delete cascade,
  page_id text not null,
  form_ids text[] not null default '{}',
  callback_token uuid not null default gen_random_uuid() unique,
  app_secret_encrypted bytea not null,
  page_access_token_encrypted bytea not null,
  is_active boolean not null default true,
  last_received_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (page_id),
  unique (organization_id, webhook_source_id)
);

alter table public.meta_lead_connections enable row level security;
revoke all on table public.meta_lead_connections from public, anon, authenticated;
grant select, insert, update, delete on table public.meta_lead_connections to service_role;

comment on table public.meta_lead_connections is
  'Vincula uma Página da Meta a uma organização e a uma fonte de webhook. Credenciais cifradas; sem acesso PostgREST de usuário.';
