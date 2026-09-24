import "server-only";
import type { LeadRecord } from "@/features/leads/types";
import { leadsConfig } from "./config";
import { renderLeadEmail } from "./email";

/**
 * Canal secundario del equipo: correo transaccional (Resend). Es independiente de Supabase,
 * así que también sirve de respaldo si la base de datos falla.
 */
export interface LeadNotifier {
  readonly name: string;
  notify(lead: LeadRecord, id?: string): Promise<void>;
}

type Email = { to: string[]; subject: string; html: string; text: string; replyTo?: string };

/** Envío con Resend vía su API HTTP: https://resend.com/docs/api-reference/emails/send-email */
export async function sendEmail(email: Email): Promise<void> {
  const { apiKey, from, apiUrl } = leadsConfig.resend;
  if (!apiKey) throw new Error("RESEND_API_KEY no está configurada.");
  const response = await fetch(`${apiUrl}/emails`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: email.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      ...(email.replyTo ? { reply_to: email.replyTo } : {}),
    }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Resend ${response.status}: ${(await response.text()).slice(0, 300)}`);
}

export const isEmailConfigured = () => Boolean(leadsConfig.resend.apiKey && leadsConfig.recipients.length);

export function getLeadNotifier(): LeadNotifier | null {
  if (!isEmailConfigured()) return null;
  return {
    name: "resend",
    async notify(lead, id) {
      const email = renderLeadEmail(lead, id);
      await sendEmail({ to: leadsConfig.recipients, ...email, replyTo: lead.email });
    },
  };
}
