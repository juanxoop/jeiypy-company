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
  resend: {
    apiKey: env("RESEND_API_KEY"),
    /** Remitente verificado en Resend. `onboarding@resend.dev` solo entrega al correo de la cuenta de Resend. */
    from: env("LEADS_EMAIL_FROM") ?? "Jeipy AI <onboarding@resend.dev>",
  },
};
