import "server-only";
import { contactConfig } from "@/config/site";
import { recentFailureCount } from "./alerts";
import { isBackupWebhookConfigured } from "./backup";
import { leadsConfig } from "./config";
import { isEmailConfigured } from "./notify";

/**
 * Diagnóstico de configuración para el equipo (sin exponer valores secretos):
 * qué está configurado, qué falta y qué advertencias hay. Lo usan /api/health y /admin/sistema.
 */
export type Check = { id: string; label: string; ok: boolean; detail: string; level: "required" | "recommended" | "optional" };

/** Rol de una clave JWT de Supabase (claves "legacy"), sin verificar la firma: solo para diagnosticar. */
function supabaseKeyKind(key?: string): { ok: boolean; detail: string } {
  if (!key) return { ok: false, detail: "Falta SUPABASE_SERVICE_ROLE_KEY." };
  if (key.startsWith("sb_secret_")) return { ok: true, detail: "Clave secreta (formato nuevo sb_secret_)." };
  if (key.startsWith("sb_publishable_")) return { ok: false, detail: "Es la clave PUBLICABLE: usa la clave secreta (sb_secret_…) o service_role." };
  try {
    const payload = JSON.parse(Buffer.from(key.split(".")[1] ?? "", "base64url").toString("utf8")) as { role?: string };
    if (payload.role === "service_role") return { ok: true, detail: "Clave service_role (formato JWT)." };
    return { ok: false, detail: `La clave es de rol "${payload.role ?? "desconocido"}": debe ser service_role.` };
  } catch {
    return { ok: false, detail: "No parece una clave de Supabase válida." };
  }
}

export function configurationChecks(): Check[] {
  const { supabase, resend, recipients, alerts, backupWebhookUrl, healthToken } = leadsConfig;
  const key = supabaseKeyKind(supabase.serviceRoleKey);
  const usingTestSender = !process.env.LEADS_EMAIL_FROM?.trim();
  return [
    { id: "supabase_url", label: "SUPABASE_URL", ok: Boolean(supabase.url), detail: supabase.url ? "Configurada." : "Falta: sin ella no se guardan leads.", level: "required" },
    { id: "supabase_key", label: "SUPABASE_SERVICE_ROLE_KEY", ok: key.ok, detail: key.detail, level: "required" },
    { id: "admin", label: "ADMIN_PASSWORD / ADMIN_SESSION_SECRET", ok: Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_SESSION_SECRET), detail: "Acceso a /admin.", level: "required" },
    {
      id: "resend",
      label: "RESEND_API_KEY + JEIPY_LEADS_EMAIL (correo de respaldo)",
      ok: isEmailConfigured(),
      detail: isEmailConfigured()
        ? `Configurado (${recipients.length} destinatario${recipients.length === 1 ? "" : "s"}).`
        : `Falta ${[!resend.apiKey && "RESEND_API_KEY", !recipients.length && "JEIPY_LEADS_EMAIL"].filter(Boolean).join(" y ")}: sin esto no hay respaldo por correo.`,
      level: "recommended",
    },
    {
      id: "resend_from",
      label: "LEADS_EMAIL_FROM (remitente verificado)",
      ok: !usingTestSender,
      detail: usingTestSender
        ? "No configurado: se usa onboarding@resend.dev, que SOLO entrega al correo dueño de la cuenta de Resend. Verifica tu dominio en Resend y define el remitente."
        : "Configurado.",
      level: "recommended",
    },
    {
      id: "backup_webhook",
      label: "LEADS_BACKUP_WEBHOOK_URL (respaldo independiente de Resend)",
      ok: isBackupWebhookConfigured(),
      detail: backupWebhookUrl
        ? process.env.LEADS_BACKUP_WEBHOOK_URL?.trim()
          ? "Configurado."
          : "Usa LEADS_ALERT_WEBHOOK_URL como respaldo (no hay un webhook de respaldo propio)."
        : "No configurado: si Supabase y el correo fallan a la vez, no hay segundo respaldo en el servidor.",
      level: "recommended",
    },
    {
      id: "alerts",
      label: "Canal de alertas (correo o LEADS_ALERT_WEBHOOK_URL)",
      ok: Boolean(alerts.webhookUrl || (alerts.recipients.length && resend.apiKey)),
      detail: alerts.webhookUrl || (alerts.recipients.length && resend.apiKey) ? "Configurado." : "Sin canal: las fallas repetidas solo quedan en los registros de Vercel.",
      level: "recommended",
    },
    {
      id: "whatsapp",
      label: "NEXT_PUBLIC_WHATSAPP_NUMBER (alternativa para el cliente)",
      ok: Boolean(contactConfig.whatsappNumber),
      detail: contactConfig.whatsappNumber ? "Configurado." : "Falta: si el envío falla, el cliente no tiene WhatsApp ni llamada como alternativa.",
      level: "recommended",
    },
    { id: "health_token", label: "HEALTHCHECK_TOKEN (monitor externo)", ok: Boolean(healthToken), detail: healthToken ? "Configurado." : "Opcional.", level: "optional" },
  ];
}

export function fallbackSummary() {
  const email = isEmailConfigured();
  const webhook = isBackupWebhookConfigured();
  return {
    email,
    webhook,
    operational: email || webhook,
    recentPersistenceFailures: recentFailureCount(),
  };
}
