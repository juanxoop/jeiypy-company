import "server-only";

/**
 * Configuración del sistema de leads. Todo se lee de variables de entorno del servidor:
 * nada de esto llega al navegador (ninguna variable lleva el prefijo NEXT_PUBLIC_).
 */
const env = (name: string) => process.env[name]?.trim() || undefined;

export const leadsConfig = {
  supabase: {
    url: env("SUPABASE_URL")?.replace(/\/$/, ""),
    serviceRoleKey: env("SUPABASE_SERVICE_ROLE_KEY"),
  },
  /** Destinatarios de la notificación. Admite varios separados por coma. */
  recipients: (env("JEIPY_LEADS_EMAIL") ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean),
  /** Alertas de errores repetidos: correo (por defecto, el mismo del equipo) y/o webhook (Slack, Discord…). */
  alerts: {
    recipients: (env("JEIPY_ALERTS_EMAIL") ?? env("JEIPY_LEADS_EMAIL") ?? "")
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean),
    webhookUrl: env("LEADS_ALERT_WEBHOOK_URL"),
  },
  /** Token para que un monitor externo consulte /api/health (Authorization: Bearer <token>). */
  healthToken: env("HEALTHCHECK_TOKEN"),
  resend: {
    apiKey: env("RESEND_API_KEY"),
    /** Remitente verificado en Resend. `onboarding@resend.dev` solo entrega al correo de la cuenta de Resend. */
    from: env("LEADS_EMAIL_FROM") ?? "Jeipy AI <onboarding@resend.dev>",
    /** Solo para pruebas o proxies: por defecto, la API oficial de Resend. */
    apiUrl: (env("RESEND_API_URL") ?? "https://api.resend.com").replace(/\/$/, ""),
  },
};
