/**
 * Contrato de un lead de Jeipy AI entre el asistente (cliente) y el backend.
 * El cliente envía una `LeadSubmission`; el servidor la valida y la convierte en `LeadRecord`.
 */
import type { AiLevel, AiTierId, DigitalChannel, Feature, Goal, PlanId, WebsiteStatus } from "@/features/assistant/types";

/** Qué pidió el cliente al dejar sus datos. */
export type LeadIntent = "quote" | "callback";

/** Estado interno del lead para el equipo. Nunca se muestra al cliente. */
export type LeadStatus =
  | "nuevo"
  | "contactado"
  | "interesado"
  | "cotizacion"
  | "solicita-llamada"
  | "cerrado-ganado"
  | "cerrado-no-interesado"
  | "cerrado-sin-respuesta";

export const LEAD_STATUSES: LeadStatus[] = [
  "nuevo",
  "contactado",
  "interesado",
  "cotizacion",
  "solicita-llamada",
  "cerrado-ganado",
  "cerrado-no-interesado",
  "cerrado-sin-respuesta",
];

/** Un lead cerrado sigue existiendo: cerrar solo cambia su estado. */
export const isClosedStatus = (status: LeadStatus) => status.startsWith("cerrado-");

export type ContactChannel = "whatsapp" | "llamada" | "correo";

export type TranscriptEntry = { role: "user" | "assistant"; text: string };

export type LeadSubmission = {
  /** Identificador de la conversación: una segunda solicitud (p. ej. llamada tras cotizar) actualiza el mismo lead. */
  conversationId: string;
  /** El cliente autorizó ser contactado por Jeipy sobre su solicitud. */
  consent: true;
  name: string;
  phone: string;
  email?: string;
  businessName?: string;
  businessType?: string;
  businessDescription?: string;
  /** existingDigitalChannels: dónde tiene presencia hoy. */
  channels: DigitalChannel[];
  websiteStatus?: WebsiteStatus;
  goal?: Goal;
  features: Feature[];
  aiInterest: boolean;
  aiLevel?: AiLevel;
  recommendedPlan?: PlanId;
  recommendedAi?: AiTierId;
  budget?: number;
  intent: LeadIntent;
  callbackRequested: boolean;
  preferredTime?: string;
  preferredChannel?: ContactChannel;
  /** Historial estructurado para consulta interna (opcional). */
  transcript?: TranscriptEntry[];
  /** Ya se había enviado un lead en esta conversación: la notificación se marca como actualización. */
  isUpdate?: boolean;
  /** Reintento de un lead que ya llegó al equipo por un canal de respaldo: no se vuelve a enviar. */
  backupNotified?: boolean;
};

export type LeadRecord = Omit<LeadSubmission, "consent"> & {
  createdAt: string;
  consentAt: string;
  status: LeadStatus;
  needs: string[];
  /** Resumen comercial en prosa. */
  summary: string;
  /** Reporte completo listo para leer (correo, CRM). */
  report: string;
  source: "jeipy-ai";
  userAgent?: string;
};

/**
 * Respuesta de POST /api/leads. `ok` solo es true si la base de datos confirmó que el lead quedó guardado.
 * `backup: "email"`: la base de datos falló, pero el lead llegó al equipo por el correo de respaldo.
 */
export type LeadSubmitResult =
  | { ok: true; id: string; notified: boolean }
  | {
      ok: false;
      error: "invalid" | "rate-limited" | "not-configured" | "failed";
      requestId?: string;
      /** Canal de respaldo que confirmó el lead cuando Supabase falló ("none": ninguno). */
      backup?: "email" | "webhook" | "none";
    };

/** Lead tal como lo guarda la base de datos (lo que lee la bandeja /admin/leads). */
export type LeadRow = {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: LeadStatus;
  intent: LeadIntent;
  name: string;
  phone: string;
  email?: string;
  businessName?: string;
  businessType?: string;
  businessDescription?: string;
  channels: DigitalChannel[];
  websiteStatus?: WebsiteStatus;
  goal?: Goal;
  needs: string[];
  features: Feature[];
  aiInterest: boolean;
  aiLevel?: AiLevel;
  recommendedPlan?: PlanId;
  recommendedAi?: AiTierId;
  budget?: number;
  callbackRequested: boolean;
  preferredTime?: string;
  preferredChannel?: ContactChannel;
  summary: string;
  report: string;
  transcript?: TranscriptEntry[];
  consentAt: string;
  closedAt?: string;
};

/** Nota interna o evento del historial (cambio de estado). */
export type LeadNote = {
  id: string;
  createdAt: string;
  author?: string;
  body: string;
  kind: "note" | "status";
  fromStatus?: LeadStatus;
  toStatus?: LeadStatus;
};
