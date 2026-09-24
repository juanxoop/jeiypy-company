-- ════════════════════════════════════════════════════════════════════
-- Jeipy AI · tablas de leads
-- Ejecutar en Supabase: SQL Editor → New query → pegar todo → Run.
-- Es idempotente: se puede ejecutar varias veces y también actualiza la
-- versión anterior de la tabla (agrega columnas y estados que falten).
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  conversation_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  status text not null default 'nuevo',
  status_changed_at timestamptz,
  intent text not null,

  name text not null,
  phone text not null,
  email text,
  business_name text,
  business_type text,
  business_description text,
  digital_channels text[] not null default '{}',
  website_status text,
  goal text,
  needs text[] not null default '{}',
  features text[] not null default '{}',
  ai_interest boolean not null default false,
  ai_level text,
  recommended_plan text,
  recommended_ai text,
  budget bigint,
  callback_requested boolean not null default false,
  preferred_time text,
  preferred_channel text,

  summary text not null,
  report text not null,
  transcript jsonb,

  consent_at timestamptz not null,
  source text not null default 'jeipy-ai',
  user_agent text
);

-- Actualización desde la versión anterior (no hace nada si ya existen).
alter table public.leads add column if not exists business_description text;
alter table public.leads add column if not exists digital_channels text[] not null default '{}';
alter table public.leads add column if not exists status_changed_at timestamptz;
alter table public.leads alter column status set default 'nuevo';
update public.leads
  set website_status = case website_status when 'yes' then 'existing' else 'none' end
  where website_status in ('yes', 'no', 'social');

alter table public.leads drop constraint if exists leads_status_check;
alter table public.leads add constraint leads_status_check
  check (status in ('nuevo', 'contactado', 'interesado', 'cotizacion', 'solicita-llamada', 'cerrado', 'no-interesado'));
alter table public.leads drop constraint if exists leads_website_status_check;
alter table public.leads add constraint leads_website_status_check
  check (website_status is null or website_status in ('none', 'existing', 'outdated', 'needs_improvement'));

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_status_idx on public.leads (status);

-- Notas internas del equipo.
create table if not exists public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  created_at timestamptz not null default now(),
  author text,
  body text not null check (char_length(body) between 1 and 4000)
);
create index if not exists lead_notes_lead_idx on public.lead_notes (lead_id, created_at desc);

-- updated_at automático.
create or replace function public.leads_set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at before update on public.leads
  for each row execute function public.leads_set_updated_at();

-- ── Seguridad ───────────────────────────────────────────────────────
-- RLS activo y SIN políticas: los roles públicos (anon, authenticated) no pueden
-- leer, crear, modificar ni borrar leads o notas, ni siquiera con la clave pública.
-- Solo el servidor de Jeipy, con la clave service_role, accede a estas tablas.
alter table public.leads enable row level security;
alter table public.lead_notes enable row level security;
revoke all on public.leads from anon, authenticated;
revoke all on public.lead_notes from anon, authenticated;
grant all on public.leads to service_role;
grant all on public.lead_notes to service_role;
