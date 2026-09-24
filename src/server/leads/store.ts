import "server-only";
import type { LeadNote, LeadRecord, LeadRow, LeadStatus } from "@/features/leads/types";
import { leadsConfig } from "./config";

/**
 * Almacenamiento de leads en Supabase (Postgres), vía su API REST con la clave de servicio.
 * Es el único almacén: el asistente escribe aquí y la bandeja /admin/leads lee de aquí.
 * La clave de servicio solo existe en el servidor; la tabla tiene RLS sin políticas públicas.
 */

const TABLE = "leads";
const NOTES = "lead_notes";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class LeadStoreError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "LeadStoreError";
  }
}

type Row = Record<string, unknown>;

function client() {
  const { url, serviceRoleKey } = leadsConfig.supabase;
  if (!url || !serviceRoleKey) return null;
  return async function request<T>(path: string, init: RequestInit & { prefer?: string } = {}): Promise<T> {
    const response = await fetch(`${url}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        ...(init.prefer ? { Prefer: init.prefer } : {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const body = await response.text();
    if (!response.ok) throw new LeadStoreError(`Supabase ${response.status}: ${body.slice(0, 400)}`, response.status);
    return (body ? JSON.parse(body) : null) as T;
  };
}

export const isStoreConfigured = () => client() !== null;

const opt = <T>(value: unknown) => (value === null || value === undefined ? undefined : (value as T));

function toRow(r: Row): LeadRow {
  return {
    id: String(r.id),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
    status: r.status as LeadStatus,
    intent: r.intent as LeadRow["intent"],
    name: String(r.name),
    phone: String(r.phone),
    email: opt(r.email),
    businessName: opt(r.business_name),
    businessType: opt(r.business_type),
    businessDescription: opt(r.business_description),
    channels: (r.digital_channels as LeadRow["channels"]) ?? [],
    websiteStatus: opt(r.website_status),
    goal: opt(r.goal),
    needs: (r.needs as string[]) ?? [],
    features: (r.features as LeadRow["features"]) ?? [],
    aiInterest: Boolean(r.ai_interest),
    aiLevel: opt(r.ai_level),
    recommendedPlan: opt(r.recommended_plan),
    recommendedAi: opt(r.recommended_ai),
    budget: r.budget === null || r.budget === undefined ? undefined : Number(r.budget),
    callbackRequested: Boolean(r.callback_requested),
    preferredTime: opt(r.preferred_time),
    preferredChannel: opt(r.preferred_channel),
    summary: String(r.summary ?? ""),
    report: String(r.report ?? ""),
    transcript: opt(r.transcript),
    consentAt: String(r.consent_at),
  };
}

/** Columnas que escribe el formulario público: nada más (el estado lo calcula el servidor). */
function fromRecord(lead: LeadRecord): Row {
  return {
    conversation_id: lead.conversationId,
    status: lead.status,
    intent: lead.intent,
    name: lead.name,
    phone: lead.phone,
    email: lead.email ?? null,
    business_name: lead.businessName ?? null,
    business_type: lead.businessType ?? null,
    business_description: lead.businessDescription ?? null,
    digital_channels: lead.channels,
    website_status: lead.websiteStatus ?? null,
    goal: lead.goal ?? null,
    needs: lead.needs,
    features: lead.features,
    ai_interest: lead.aiInterest,
    ai_level: lead.aiLevel ?? null,
    recommended_plan: lead.recommendedPlan ?? null,
    recommended_ai: lead.recommendedAi ?? null,
    budget: lead.budget ?? null,
    callback_requested: lead.callbackRequested,
    preferred_time: lead.preferredTime ?? null,
    preferred_channel: lead.preferredChannel ?? null,
    summary: lead.summary,
    report: lead.report,
    transcript: lead.transcript ?? null,
    consent_at: lead.consentAt,
    source: lead.source,
    user_agent: lead.userAgent ?? null,
  };
}

function requireClient() {
  const request = client();
  if (!request) throw new LeadStoreError("Supabase no está configurado (SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY).");
  return request;
}

/**
 * Guarda o actualiza el lead de una conversación y devuelve la fila que quedó en la base de datos.
 * Si Supabase no devuelve la fila, se considera que no se guardó.
 */
export async function saveLead(lead: LeadRecord): Promise<LeadRow> {
  const request = requireClient();
  const rows = await request<Row[]>(`${TABLE}?on_conflict=conversation_id`, {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: JSON.stringify(fromRecord(lead)),
  });
  if (!Array.isArray(rows) || !rows[0]?.id) throw new LeadStoreError("Supabase no confirmó la escritura del lead.");
  return toRow(rows[0]);
}

const LIST_COLUMNS =
  "id,created_at,updated_at,status,intent,name,phone,email,business_name,business_type,business_description,digital_channels,website_status,goal,needs,features,ai_interest,ai_level,recommended_plan,recommended_ai,budget,callback_requested,preferred_time,preferred_channel,summary,report,consent_at";

export async function listLeads(limit = 500): Promise<LeadRow[]> {
  const request = requireClient();
  const rows = await request<Row[]>(`${TABLE}?select=${LIST_COLUMNS}&order=created_at.desc&limit=${limit}`);
  return rows.map(toRow);
}

export async function getLead(id: string): Promise<{ lead: LeadRow; notes: LeadNote[] } | null> {
  if (!UUID.test(id)) return null;
  const request = requireClient();
  const rows = await request<Row[]>(
    `${TABLE}?id=eq.${id}&select=*,${NOTES}(id,created_at,author,body)&${NOTES}.order=created_at.desc`,
  );
  const row = rows[0];
  if (!row) return null;
  const notes = ((row[NOTES] as Row[]) ?? []).map((n) => ({
    id: String(n.id),
    createdAt: String(n.created_at),
    author: opt<string>(n.author),
    body: String(n.body),
  }));
  return { lead: toRow(row), notes };
}

export async function updateLeadStatus(id: string, status: LeadStatus): Promise<void> {
  if (!UUID.test(id)) throw new LeadStoreError("Id de lead inválido.");
  const request = requireClient();
  const rows = await request<Row[]>(`${TABLE}?id=eq.${id}`, {
    method: "PATCH",
    prefer: "return=representation",
    body: JSON.stringify({ status, status_changed_at: new Date().toISOString() }),
  });
  if (!rows.length) throw new LeadStoreError("El lead no existe.");
}

export async function addLeadNote(id: string, body: string, author?: string): Promise<void> {
  if (!UUID.test(id)) throw new LeadStoreError("Id de lead inválido.");
  const request = requireClient();
  const rows = await request<Row[]>(NOTES, {
    method: "POST",
    prefer: "return=representation",
    body: JSON.stringify({ lead_id: id, body, author: author ?? null }),
  });
  if (!rows.length) throw new LeadStoreError("Supabase no confirmó la nota.");
}

/** Diagnóstico para la bandeja: ¿hay conexión y existen las tablas? */
export async function storeHealth(): Promise<{ ok: true } | { ok: false; reason: string }> {
  const request = client();
  if (!request) return { ok: false, reason: "Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en las variables de entorno." };
  try {
    await request(`${TABLE}?select=id,digital_channels,business_description&limit=1`);
    await request(`${NOTES}?select=id&limit=1`);
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/42P01|PGRST205|does not exist|Could not find the table/i.test(message)) {
      return { ok: false, reason: "Las tablas no existen o están desactualizadas: ejecuta supabase/leads.sql en el SQL Editor de Supabase." };
    }
    if (/42703|column/i.test(message)) {
      return { ok: false, reason: "La tabla leads es de una versión anterior: vuelve a ejecutar supabase/leads.sql (es seguro, solo agrega lo que falta)." };
    }
    if (/401|403|JWT|Invalid API key/i.test(message)) {
      return { ok: false, reason: "Supabase rechazó la clave: revisa que SUPABASE_SERVICE_ROLE_KEY sea la clave service_role (secreta) del proyecto." };
    }
    return { ok: false, reason: `No se pudo conectar con Supabase: ${message}` };
  }
}
