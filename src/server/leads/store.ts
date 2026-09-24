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
  /** Fallas pasajeras que vale la pena reintentar (red, tiempo agotado, 5xx, 408, 429). */
  get transient(): boolean {
    return this.status === undefined || this.status >= 500 || this.status === 408 || this.status === 429;
  }
}

/** Reintentos con espera creciente para escrituras críticas. */
export const RETRY = { attempts: 3, timeoutMs: 4_000, backoffMs: [400, 1_200] } as const;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function withRetry<T>(label: string, run: () => Promise<T>, onRetry?: (attempt: number, error: unknown) => void): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= RETRY.attempts; attempt++) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      const transient = !(error instanceof LeadStoreError) || error.transient;
      if (!transient || attempt === RETRY.attempts) break;
      onRetry?.(attempt, error);
      await sleep(RETRY.backoffMs[attempt - 1] ?? 1_500);
    }
  }
  throw lastError instanceof Error ? lastError : new LeadStoreError(`${label}: ${String(lastError)}`);
}

type Row = Record<string, unknown>;

function client() {
  const { url, serviceRoleKey } = leadsConfig.supabase;
  if (!url || !serviceRoleKey) return null;
  return async function request<T>(path: string, init: RequestInit & { prefer?: string; timeoutMs?: number } = {}): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${url}/rest/v1/${path}`, {
        ...init,
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
          ...(init.prefer ? { Prefer: init.prefer } : {}),
        },
        cache: "no-store",
        signal: AbortSignal.timeout(init.timeoutMs ?? 8_000),
      });
    } catch (error) {
      // Red caída o tiempo agotado: se trata como falla pasajera (sin código HTTP).
      throw new LeadStoreError(`Supabase no respondió: ${error instanceof Error ? error.message : String(error)}`);
    }
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
    closedAt: opt(r.closed_at),
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
    status_changed_by: "Jeipy AI (solicitud del cliente)",
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
export async function saveLead(lead: LeadRecord, onRetry?: (attempt: number, error: unknown) => void): Promise<LeadRow> {
  const request = requireClient();
  // Reintentar es seguro: la escritura es un upsert por conversation_id (no duplica leads).
  return withRetry(
    "saveLead",
    async () => {
      const rows = await request<Row[]>(`${TABLE}?on_conflict=conversation_id`, {
        method: "POST",
        prefer: "resolution=merge-duplicates,return=representation",
        body: JSON.stringify(fromRecord(lead)),
        timeoutMs: RETRY.timeoutMs,
      });
      if (!Array.isArray(rows) || !rows[0]?.id) throw new LeadStoreError("Supabase no confirmó la escritura del lead.", 502);
      return toRow(rows[0]);
    },
    onRetry,
  );
}

const LIST_COLUMNS =
  "closed_at,id,created_at,updated_at,status,intent,name,phone,email,business_name,business_type,business_description,digital_channels,website_status,goal,needs,features,ai_interest,ai_level,recommended_plan,recommended_ai,budget,callback_requested,preferred_time,preferred_channel,summary,report,consent_at";

export async function listLeads(limit = 500): Promise<LeadRow[]> {
  const request = requireClient();
  const rows = await request<Row[]>(`${TABLE}?select=${LIST_COLUMNS}&order=created_at.desc&limit=${limit}`);
  return rows.map(toRow);
}

export async function getLead(id: string): Promise<{ lead: LeadRow; notes: LeadNote[] } | null> {
  if (!UUID.test(id)) return null;
  const request = requireClient();
  const rows = await request<Row[]>(
    `${TABLE}?id=eq.${id}&select=*,${NOTES}(id,created_at,author,body,kind,from_status,to_status)&${NOTES}.order=created_at.desc`,
  );
  const row = rows[0];
  if (!row) return null;
  const notes: LeadNote[] = ((row[NOTES] as Row[]) ?? []).map((n) => ({
    id: String(n.id),
    createdAt: String(n.created_at),
    author: opt<string>(n.author),
    body: String(n.body),
    kind: n.kind === "status" ? "status" : "note",
    fromStatus: opt<LeadStatus>(n.from_status),
    toStatus: opt<LeadStatus>(n.to_status),
  }));
  return { lead: toRow(row), notes };
}

/** Cambia el estado. El historial (estado anterior → nuevo) lo registra la base de datos. Nunca borra. */
export async function updateLeadStatus(id: string, status: LeadStatus, author = "Equipo Jeipy"): Promise<void> {
  if (!UUID.test(id)) throw new LeadStoreError("Id de lead inválido.");
  const request = requireClient();
  const rows = await request<Row[]>(`${TABLE}?id=eq.${id}`, {
    method: "PATCH",
    prefer: "return=representation",
    body: JSON.stringify({ status, status_changed_by: author }),
  });
  if (!rows.length) throw new LeadStoreError("El lead no existe.");
}

export async function addLeadNote(id: string, body: string, author?: string): Promise<void> {
  if (!UUID.test(id)) throw new LeadStoreError("Id de lead inválido.");
  const request = requireClient();
  const rows = await request<Row[]>(NOTES, {
    method: "POST",
    prefer: "return=representation",
    body: JSON.stringify({ lead_id: id, body, author: author ?? null, kind: "note" }),
  });
  if (!rows.length) throw new LeadStoreError("Supabase no confirmó la nota.");
}

/**
 * Escritura de prueba no destructiva: sobrescribe una única fila de `lead_system_health`.
 * Confirma que el servidor puede escribir en Supabase sin tocar leads reales.
 */
export async function storeWriteCheck(): Promise<{ ok: true; latencyMs: number } | { ok: false; reason: string }> {
  const request = client();
  if (!request) return { ok: false, reason: "Supabase no está configurado." };
  const started = Date.now();
  try {
    const rows = await request<Row[]>("lead_system_health?on_conflict=id", {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=representation",
      body: JSON.stringify({ id: "write-check", checked_at: new Date().toISOString() }),
      timeoutMs: RETRY.timeoutMs,
    });
    if (!rows.length) return { ok: false, reason: "Supabase no confirmó la escritura de prueba." };
    return { ok: true, latencyMs: Date.now() - started };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

/** Diagnóstico para la bandeja: ¿hay conexión y existen las tablas? */
export async function storeHealth(): Promise<{ ok: true } | { ok: false; reason: string }> {
  const request = client();
  if (!request) return { ok: false, reason: "Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en las variables de entorno." };
  try {
    await request(`${TABLE}?select=id,digital_channels,business_description,closed_at&limit=1`);
    await request(`${NOTES}?select=id,kind&limit=1`);
    await request("lead_system_health?select=id&limit=1");
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
