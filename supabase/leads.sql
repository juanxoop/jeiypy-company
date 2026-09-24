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

alter table public.leads add column if not exists status_changed_by text;
alter table public.leads add column if not exists closed_at timestamptz;

-- Estados. Cerrar un lead cambia su estado: nunca lo borra.
-- (Versión anterior: 'cerrado' pasa a 'cerrado-ganado' y 'no-interesado' a 'cerrado-no-interesado'.)
alter table public.leads drop constraint if exists leads_status_check;
update public.leads set status = 'cerrado-ganado' where status = 'cerrado';
update public.leads set status = 'cerrado-no-interesado' where status = 'no-interesado';
alter table public.leads add constraint leads_status_check
  check (status in (
    'nuevo', 'contactado', 'interesado', 'cotizacion', 'solicita-llamada',
    'cerrado-ganado', 'cerrado-no-interesado', 'cerrado-sin-respuesta'
  ));
alter table public.leads drop constraint if exists leads_website_status_check;
alter table public.leads add constraint leads_website_status_check
  check (website_status is null or website_status in ('none', 'existing', 'outdated', 'needs_improvement'));

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_status_idx on public.leads (status);

-- Notas internas e historial de actividad del lead (una sola tabla).
--   kind = 'note'   → nota escrita por el equipo
--   kind = 'status' → cambio de estado (from_status → to_status), registrado automáticamente
create table if not exists public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  created_at timestamptz not null default now(),
  author text,
  body text not null check (char_length(body) between 1 and 4000)
);
alter table public.lead_notes add column if not exists kind text not null default 'note';
alter table public.lead_notes add column if not exists from_status text;
alter table public.lead_notes add column if not exists to_status text;
alter table public.lead_notes drop constraint if exists lead_notes_kind_check;
alter table public.lead_notes add constraint lead_notes_kind_check check (kind in ('note', 'status'));
create index if not exists lead_notes_lead_idx on public.lead_notes (lead_id, created_at desc);

-- updated_at, fecha de cambio de estado y fecha de cierre automáticas.
create or replace function public.leads_set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    new.updated_at = now();
    if new.status is distinct from old.status then
      new.status_changed_at = now();
    end if;
  end if;
  if new.status like 'cerrado-%' then
    if tg_op = 'INSERT' or old.status not like 'cerrado-%' then new.closed_at = now(); end if;
  else
    new.closed_at = null;
  end if;
  return new;
end;
$$;
drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at before insert or update on public.leads
  for each row execute function public.leads_set_updated_at();

-- Historial: cada alta y cada cambio de estado quedan registrados, venga del equipo o del cliente.
create or replace function public.leads_log_status() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.lead_notes (lead_id, kind, to_status, author, body)
    values (new.id, 'status', new.status, coalesce(new.status_changed_by, 'Jeipy AI'), 'Solicitud recibida desde Jeipy AI');
  elsif new.status is distinct from old.status then
    insert into public.lead_notes (lead_id, kind, from_status, to_status, author, body)
    values (new.id, 'status', old.status, new.status, coalesce(new.status_changed_by, 'Sistema'), 'Cambio de estado');
  end if;
  return null;
end;
$$;
drop trigger if exists leads_log_status on public.leads;
create trigger leads_log_status after insert or update of status on public.leads
  for each row execute function public.leads_log_status();

-- Comprobación de salud: una sola fila que se sobrescribe (nunca borra ni toca leads reales).
create table if not exists public.lead_system_health (
  id text primary key,
  checked_at timestamptz not null default now()
);

-- ── Seguridad ───────────────────────────────────────────────────────
-- RLS activo y SIN políticas: los roles públicos (anon, authenticated) no pueden
-- leer, crear, modificar ni borrar leads o notas, ni siquiera con la clave pública.
-- Solo el servidor de Jeipy, con la clave service_role, accede a estas tablas.
alter table public.leads enable row level security;
alter table public.lead_notes enable row level security;
alter table public.lead_system_health enable row level security;
revoke all on public.leads from anon, authenticated;
revoke all on public.lead_notes from anon, authenticated;
revoke all on public.lead_system_health from anon, authenticated;
revoke all on function public.leads_set_updated_at() from public, anon, authenticated;
revoke all on function public.leads_log_status() from public, anon, authenticated;

-- El servidor puede leer, crear y actualizar, pero NO borrar: cerrar un lead nunca elimina datos.
-- (Solo un administrador desde el SQL Editor podría borrar, a propósito.)
grant select, insert, update on public.leads to service_role;
grant select, insert, update on public.lead_notes to service_role;
grant select, insert, update on public.lead_system_health to service_role;
revoke delete, truncate on public.leads from service_role;
revoke delete, truncate on public.lead_notes from service_role;
revoke delete, truncate on public.lead_system_health from service_role;
