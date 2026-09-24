import "server-only";

/**
 * Configuración del sistema de leads. Todo se lee de variables de entorno del servidor:
 * nada de esto llega al navegador (ninguna variable lleva el prefijo NEXT_PUBLIC_).
 */
const env = (name: string) => process.env[name]?.trim() || undefined;

export const leadsConfig = {
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
  supabase: {
    url: env("SUPABASE_URL")?.replace(/\/$/, ""),
    serviceRoleKey: env("SUPABASE_SERVICE_ROLE_KEY"),
    table: env("SUPABASE_LEADS_TABLE") ?? "leads",
  },
  /** "file": guarda en .data/leads.jsonl (solo para desarrollo local; en Vercel el disco no persiste). */
  store: env("LEADS_STORE") ?? (process.env.NODE_ENV === "development" ? "file" : undefined),
};
