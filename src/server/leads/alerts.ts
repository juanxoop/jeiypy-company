import "server-only";
import { siteConfig } from "@/config/site";
import { leadsConfig } from "./config";
import { sendEmail } from "./notify";

/**
 * Alertas de persistencia: si Supabase falla de forma repetida, el equipo se entera antes de
 * que varios clientes queden sin atender. Cada falla queda en los registros; la alerta se
 * envía al superar el umbral (o de inmediato si un lead quedó sin ningún respaldo) y se
 * limita a una cada 30 minutos por instancia del servidor.
 */
const WINDOW_MS = 15 * 60_000;
const COOLDOWN_MS = 30 * 60_000;
const THRESHOLD = 2;

const failures: number[] = [];
let lastAlertAt = 0;

export type PersistenceFailure = {
  requestId: string;
  source: "lead" | "health";
  reason: string;
  /** Lead afectado (solo nombre y teléfono, para poder contactarlo si no hubo respaldo). */
  lead?: { name: string; phone: string };
  backup?: "email" | "webhook" | "none";
};

export function recentFailureCount(now = Date.now()): number {
  while (failures.length && now - failures[0] > WINDOW_MS) failures.shift();
  return failures.length;
}

export async function reportPersistenceFailure(failure: PersistenceFailure): Promise<void> {
  const now = Date.now();
  failures.push(now);
  const count = recentFailureCount(now);
  console.error(`[leads-alert] Falla de persistencia (${failure.source}, ref ${failure.requestId}, ${count} en 15 min): ${failure.reason}`);

  const leadAtRisk = failure.source === "lead" && failure.backup === "none";
  if ((count < THRESHOLD && !leadAtRisk) || now - lastAlertAt < COOLDOWN_MS) return;
  lastAlertAt = now;

  const lines = [
    `⚠️ Jeipy AI: fallas guardando leads en Supabase (${count} en los últimos 15 minutos).`,
    `Última falla: ${failure.reason} (ref ${failure.requestId}).`,
    failure.lead
      ? `Lead afectado: ${failure.lead.name} · ${failure.lead.phone} · ${
          failure.backup === "email" ? "llegó por correo de respaldo" : failure.backup === "webhook" ? "llegó por el webhook de respaldo" : "SIN respaldo: contáctalo directamente"
        }.`
      : undefined,
    `Revisa ${siteConfig.url}/api/health y los registros del servidor en Vercel.`,
  ].filter(Boolean) as string[];
  const text = lines.join("\n");

  const tasks: Promise<unknown>[] = [];
  const { recipients, webhookUrl } = leadsConfig.alerts;
  if (recipients.length && leadsConfig.resend.apiKey) {
    tasks.push(
      sendEmail({
        to: recipients,
        subject: `⚠️ Alerta Jeipy AI: fallas guardando leads (${count})`,
        text,
        html: `<pre style="font-family:inherit;white-space:pre-wrap">${text.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c]!)}</pre>`,
      }),
    );
  }
  if (webhookUrl) {
    tasks.push(
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // `text` (Slack) y `content` (Discord): funciona con webhooks entrantes de ambos.
        body: JSON.stringify({ text, content: text }),
        signal: AbortSignal.timeout(5_000),
      }).then((r) => {
        if (!r.ok) throw new Error(`Webhook ${r.status}`);
      }),
    );
  }
  if (!tasks.length) {
    console.error("[leads-alert] No hay canal de alertas configurado (JEIPY_ALERTS_EMAIL/JEIPY_LEADS_EMAIL + RESEND_API_KEY o LEADS_ALERT_WEBHOOK_URL).");
    return;
  }
  const results = await Promise.allSettled(tasks);
  for (const r of results) if (r.status === "rejected") console.error("[leads-alert] No se pudo enviar la alerta:", r.reason);
}
