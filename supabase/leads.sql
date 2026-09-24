-- Tabla de leads de Jeipy AI.
-- Ejecutar una vez en Supabase: SQL Editor → New query → pegar y ejecutar.

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  conversation_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Clasificación interna (no se muestra al cliente): nuevo | interesado | cotizacion | solicita-llamada
  status text not null,
  -- Qué pidió: quote | callback
  intent text not null,

  name text not null,
  phone text not null,
  email text,
  business_name text,
  business_type text,
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

  -- Resumen comercial en prosa y reporte completo listo para leer.
  summary text not null,
  report text not null,
  -- Historial estructurado [{ role, text }] para consulta interna.
  transcript jsonb,

  consent_at timestamptz not null,
  source text not null default 'jeipy-ai',
  user_agent text
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_status_idx on public.leads (status);

-- Sin políticas públicas: solo el servidor (clave de servicio) puede leer y escribir.
alter table public.leads enable row level security;
