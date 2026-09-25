import "server-only";
import { presenceLabel } from "@/features/leads/labels";
import { recommendationLabel } from "@/features/leads/report";
import type { LeadRecord } from "@/features/leads/types";
import { leadsConfig } from "./config";

/**
 * Respaldo por webhook: canal independiente de Supabase y de Resend. Se usa cuando la base de
 * datos falló y el correo no confirmó. Envía el lead completo en texto (Slack `text`, Discord
 * `content`) y estructurado (`lead`), para Make, Zapier o una hoja de cálculo.
 */
export const isBackupWebhookConfigured = () => Boolean(leadsConfig.backupWebhookUrl);

export async function sendLeadToBackupWebhook(lead: LeadRecord, requestId: string): Promise<void> {
  const url = leadsConfig.backupWebhookUrl;
  if (!url) throw new Error("LEADS_BACKUP_WEBHOOK_URL no está configurada.");
  const lines = [
    `🆘 Lead de respaldo (Supabase no disponible · ref ${requestId})`,
    `Nombre: ${lead.name}`,
    `Negocio: ${[lead.businessName, lead.businessType].filter(Boolean).join(" · ") || "—"}`,
    `Teléfono: ${lead.phone}`,
    `Email: ${lead.email ?? "—"}`,
    `Necesidad: ${lead.needs.join(" + ") || "—"}`,
    `Presencia digital: ${presenceLabel(lead.channels, lead.websiteStatus) ?? "—"}`,
    `Presupuesto: ${lead.budget ? `$${lead.budget.toLocaleString("es-CO")} COP` : "No indicado"}`,
    `Recomendación: ${recommendationLabel(lead) ?? "—"}`,
    `Solicita llamada: ${lead.callbackRequested ? `Sí${lead.preferredTime ? ` · ${lead.preferredTime}` : ""}` : "No"}`,
    `Resumen: ${lead.summary}`,
  ];
  const text = lines.join("\n");
  const { transcript: _transcript, ...structured } = lead;
  void _transcript;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, content: text.slice(0, 1900), lead: structured, requestId }),
    signal: AbortSignal.timeout(6_000),
  });
  if (!response.ok) throw new Error(`Webhook de respaldo ${response.status}: ${(await response.text()).slice(0, 200)}`);
}
