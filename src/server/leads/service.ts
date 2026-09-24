import "server-only";
import { needsLabels } from "@/features/leads/labels";
import { buildNarrative, buildReport, classifyLead } from "@/features/leads/report";
import type { LeadRecord, LeadSubmission } from "@/features/leads/types";
import { getLeadNotifier } from "./notify";
import { isStoreConfigured, saveLead } from "./store";

export type ProcessResult =
  | { ok: true; id: string; notified: boolean }
  | { ok: false; reason: "not-configured" | "failed" };

export function buildLeadRecord(lead: LeadSubmission, meta: { userAgent?: string } = {}): LeadRecord {
  const status = classifyLead(lead);
  const now = new Date().toISOString();
  return {
    ...lead,
    createdAt: now,
    consentAt: now,
    status,
    needs: needsLabels(lead.goal, lead.features),
    summary: buildNarrative(lead),
    report: buildReport(lead, status),
    source: "jeipy-ai",
    userAgent: meta.userAgent?.slice(0, 300),
  };
}

/**
 * Nuevo lead → base de datos → (bandeja) → correo.
 * El éxito depende SOLO de que la base de datos confirme la escritura. El correo es un aviso
 * adicional: si falla o no está configurado, el lead igual queda en la bandeja.
 */
export async function processLead(
  lead: LeadSubmission,
  meta: { userAgent?: string; requestId: string },
): Promise<ProcessResult> {
  if (!isStoreConfigured()) {
    console.error(`[leads ${meta.requestId}] Base de datos no configurada: faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY.`);
    return { ok: false, reason: "not-configured" };
  }

  const record = buildLeadRecord(lead, meta);
  let id: string;
  try {
    id = (await saveLead(record)).id;
  } catch (error) {
    console.error(`[leads ${meta.requestId}] Error guardando en Supabase:`, error);
    return { ok: false, reason: "failed" };
  }

  let notified = false;
  const notifier = getLeadNotifier();
  if (notifier) {
    try {
      await notifier.notify(record, id);
      notified = true;
    } catch (error) {
      console.error(`[leads ${meta.requestId}] Lead ${id} guardado, pero falló el correo (${notifier.name}):`, error);
    }
  }
  return { ok: true, id, notified };
}
