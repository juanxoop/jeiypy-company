import "server-only";
import type { LeadRecord } from "@/features/leads/types";
import { leadsConfig } from "./config";
import { renderLeadEmail } from "./email";

/**
 * Notificación al equipo. Interfaz mínima para cambiar de proveedor (Resend hoy;
 * otro servicio de correo, Slack o WhatsApp Business mañana).
 */
export interface LeadNotifier {
  readonly name: string;
  notify(lead: LeadRecord): Promise<void>;
}

/** Resend vía su API HTTP: https://resend.com/docs/api-reference/emails/send-email */
function resendNotifier(apiKey: string, from: string, to: string[]): LeadNotifier {
  return {
    name: "resend",
    async notify(lead) {
      const email = renderLeadEmail(lead);
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to,
          subject: email.subject,
          html: email.html,
          text: email.text,
          ...(lead.email ? { reply_to: lead.email } : {}),
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error(`Resend ${response.status}: ${(await response.text()).slice(0, 300)}`);
    },
  };
}

export function getLeadNotifier(): LeadNotifier | null {
  const { resend, recipients } = leadsConfig;
  if (resend.apiKey && recipients.length) return resendNotifier(resend.apiKey, resend.from, recipients);
  return null;
}
