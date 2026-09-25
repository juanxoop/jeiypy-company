import "server-only";
import { payloadFromConversation } from "@/features/leads/sample";
import { leadsConfig } from "./config";
import { buildLeadRecord } from "./service";
import { LeadStoreError, fromRecord, getLead, saveLead, storeErrorInfo, updateLeadStatus, type StoreErrorInfo } from "./store";
import { validateLead } from "./validate";

/**
 * Diagnóstico de persistencia en producción (GET /api/health?probe=lead, solo equipo o token):
 *
 * 1. schema: compara las columnas que envía el servidor con las de `public.leads` en la base real
 *    (descripción OpenAPI de PostgREST, con la clave de servicio). Detecta columnas faltantes,
 *    NOT NULL sin valor y nombres distintos sin tocar datos.
 * 2. write: guarda un lead de prueba con el MISMO payload que genera Jeipy AI (motor real) y el
 *    mismo camino que un lead real (validación → registro → upsert en Supabase).
 * 3. read: lo recupera y comprueba que quedó igual.
 * 4. cleanup: lo cierra como "cerrado-sin-respuesta" (service_role no puede borrar, a propósito).
 *    Siempre usa la misma conversación, así solo existe UNA fila de diagnóstico, marcada como prueba.
 *
 * No envía correo ni webhook. Si algo falla, devuelve el error de Supabase en forma segura.
 */
export const PROBE_CONVERSATION = "diagnostico-persistencia-jeipy";

type Step = { step: string; ok: boolean; ms: number; detail?: string; error?: StoreErrorInfo };

async function timed(step: string, run: () => Promise<string | undefined>): Promise<Step> {
  const started = Date.now();
  try {
    const detail = await run();
    return { step, ok: true, ms: Date.now() - started, detail };
  } catch (error) {
    return { step, ok: false, ms: Date.now() - started, error: storeErrorInfo(error) };
  }
}

/** Columnas reales de public.leads según la API de Supabase (OpenAPI de PostgREST). */
async function liveColumns(): Promise<{ columns: string[]; required: string[] } | null> {
  const { url, serviceRoleKey } = leadsConfig.supabase;
  if (!url || !serviceRoleKey) return null;
  const response = await fetch(`${url}/rest/v1/`, {
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, Accept: "application/openapi+json" },
    cache: "no-store",
    signal: AbortSignal.timeout(6_000),
  });
  if (!response.ok) return null;
  const spec = (await response.json().catch(() => null)) as {
    definitions?: Record<string, { properties?: Record<string, { default?: unknown }>; required?: string[] }>;
  } | null;
  const leads = spec?.definitions?.leads;
  if (!leads?.properties) return null;
  const properties = leads.properties;
  // PostgREST marca como "required" toda columna NOT NULL, aunque tenga DEFAULT: solo cuentan las que no lo tienen.
  const required = (leads.required ?? []).filter((k) => properties[k]?.default === undefined);
  return { columns: Object.keys(properties), required };
}

export async function leadPersistenceProbe(): Promise<{ ok: boolean; steps: Step[] }> {
  const payload = payloadFromConversation(
    ["Tengo una ferretería, solo uso WhatsApp y quiero mostrar mis productos.", "No", "Quiero este plan"],
    { name: "Diagnostico Jeipy", phone: "300 000 0000", businessName: "PRUEBA DIAGNÓSTICO — no contactar" },
    PROBE_CONVERSATION,
  );
  const steps: Step[] = [];
  const validation = validateLead(JSON.parse(JSON.stringify(payload)));
  if (!validation.ok) return { ok: false, steps: [{ step: "validación", ok: false, ms: 0, detail: `Payload rechazado: ${validation.reason}` }] };
  const record = buildLeadRecord(validation.lead, { userAgent: "diagnostico /api/health" });
  const row = fromRecord(record);

  steps.push(
    await timed("schema", async () => {
      const live = await liveColumns();
      if (!live) return "No disponible (la API no expone la descripción del schema); se valida con la escritura real.";
      const missing = Object.keys(row).filter((k) => !live.columns.includes(k));
      const unfilled = live.required.filter((k) => row[k] === undefined || row[k] === null);
      if (missing.length || unfilled.length) {
        throw new LeadStoreError("", undefined, {
          code: "SCHEMA",
          message: [missing.length && `Columnas que el servidor envía y no existen en public.leads: ${missing.join(", ")}`, unfilled.length && `Obligatorias sin valor: ${unfilled.join(", ")}`]
            .filter(Boolean)
            .join(" · "),
          column: missing[0] ?? unfilled[0],
          diagnosis: "El schema de producción no coincide con supabase/leads.sql: ejecútalo de nuevo en el SQL Editor (es idempotente).",
        });
      }
      return `${live.columns.length} columnas; todas las que envía el servidor existen.`;
    }),
  );

  let id = "";
  steps.push(
    await timed("write", async () => {
      id = (await saveLead(record)).id;
      return `Lead de prueba guardado (id ${id}, status ${record.status}).`;
    }),
  );
  if (id) {
    steps.push(
      await timed("read", async () => {
        const found = await getLead(id);
        if (!found) throw new Error("El lead guardado no se pudo leer de vuelta.");
        const same = found.lead.name === record.name && found.lead.recommendedPlan === record.recommendedPlan && (found.lead.transcript?.length ?? 0) === (record.transcript?.length ?? 0);
        if (!same) throw new Error("El lead leído no coincide con el guardado.");
        return "Lead recuperado y verificado.";
      }),
      await timed("cleanup", async () => {
        await updateLeadStatus(id, "cerrado-sin-respuesta", "Diagnóstico automático");
        return "Cerrado como 'sin respuesta' (queda en Cerrados como PRUEBA DIAGNÓSTICO).";
      }),
    );
  }
  return { ok: steps.every((s) => s.ok), steps };
}
