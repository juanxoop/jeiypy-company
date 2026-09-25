import "server-only";
import { needsLabels } from "@/features/leads/labels";
import { buildNarrative, buildReport, classifyLead } from "@/features/leads/report";
import type { LeadRecord, LeadSubmission } from "@/features/leads/types";
import { reportPersistenceFailure } from "./alerts";
import { isBackupWebhookConfigured, sendLeadToBackupWebhook } from "./backup";
import { getLeadNotifier } from "./notify";
import { isStoreConfigured, saveLead } from "./store";

export type ProcessResult =
  | { ok: true; id: string; notified: boolean }
  | { ok: false; reason: "not-configured" | "failed"; backup: "email" | "webhook" | "none" };

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
 * Nuevo lead:
 * 1. Se guarda en Supabase (con reintentos y tiempo límite) y, EN PARALELO, se avisa al equipo
 *    por correo (canal independiente, cuando está configurado).
 * 2. El éxito depende SOLO de la confirmación de Supabase.
 * 3. Si Supabase falla tras los reintentos, el respaldo es el correo ya enviado; si el correo
 *    no confirmó, se envía el lead al webhook de respaldo (independiente de Resend).
 * 4. Se registra la falla y se alerta al equipo si se repite o si el lead quedó sin respaldo.
 */
export async function processLead(
  lead: LeadSubmission,
  meta: { userAgent?: string; requestId: string },
): Promise<ProcessResult> {
  const record = buildLeadRecord(lead, meta);
  const notifier = lead.backupNotified ? null : getLeadNotifier();
  const log = (message: string, error?: unknown) => console.error(`[leads ${meta.requestId}] ${message}`, error ?? "");

  const saving = isStoreConfigured()
    ? saveLead(record, (attempt, error) => log(`Supabase falló (intento ${attempt}), reintentando…`, error)).then((row) => row.id)
    : Promise.reject(new Error("Base de datos no configurada: faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY."));
  const notifying = notifier ? notifier.notify(record) : Promise.resolve(false as const);

  const [saved, sent] = await Promise.allSettled([saving, notifying]);
  const notified = Boolean(notifier) && sent.status === "fulfilled";
  if (notifier && sent.status === "rejected") log(`El correo al equipo falló (${notifier.name}):`, sent.reason);

  if (saved.status === "fulfilled") return { ok: true, id: saved.value, notified };

  const reason = saved.reason instanceof Error ? saved.reason.message : String(saved.reason);
  let backup: "email" | "webhook" | "none" = notified || lead.backupNotified ? "email" : "none";
  if (backup === "none" && isBackupWebhookConfigured()) {
    try {
      await sendLeadToBackupWebhook(record, meta.requestId);
      backup = "webhook";
    } catch (error) {
      log("El webhook de respaldo también falló:", error);
    }
  }
  log(`No se pudo guardar el lead en Supabase tras los reintentos (respaldo: ${backup}).`, saved.reason);
  await reportPersistenceFailure({
    requestId: meta.requestId,
    source: "lead",
    reason,
    lead: { name: lead.name, phone: lead.phone },
    backup,
  });
  return { ok: false, reason: isStoreConfigured() ? "failed" : "not-configured", backup };
}
