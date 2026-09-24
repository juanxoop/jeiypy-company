import "server-only";
import { needsLabels } from "@/features/leads/labels";
import { buildNarrative, buildReport, classifyLead } from "@/features/leads/report";
import type { LeadRecord, LeadSubmission } from "@/features/leads/types";
import { getLeadNotifier } from "./notify";
import { getLeadStore } from "./store";

export type ProcessResult = {
  /** Hay al menos un destino configurado (almacenamiento o notificación). */
  configured: boolean;
  stored: boolean;
  notified: boolean;
};

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

/** Guarda el lead y avisa al equipo. Nunca informa éxito si ninguno de los dos ocurrió. */
export async function processLead(lead: LeadSubmission, meta: { userAgent?: string } = {}): Promise<ProcessResult> {
  const store = getLeadStore();
  const notifier = getLeadNotifier();
  if (!store && !notifier) {
    console.warn("[leads] Sin destino configurado: define SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY y/o RESEND_API_KEY + JEIPY_LEADS_EMAIL.");
    return { configured: false, stored: false, notified: false };
  }

  const record = buildLeadRecord(lead, meta);
  const [saved, sent] = await Promise.allSettled([store?.save(record), notifier?.notify(record)]);

  if (store && saved.status === "rejected") console.error(`[leads] Error guardando en ${store.name}:`, saved.reason);
  if (notifier && sent.status === "rejected") console.error(`[leads] Error notificando con ${notifier.name}:`, sent.reason);

  return {
    configured: true,
    stored: Boolean(store) && saved.status === "fulfilled",
    notified: Boolean(notifier) && sent.status === "fulfilled",
  };
}

/** Qué hay conectado, sin exponer ningún valor secreto. */
export function leadsStatus() {
  return { storage: getLeadStore()?.name ?? null, notifications: getLeadNotifier()?.name ?? null };
}
