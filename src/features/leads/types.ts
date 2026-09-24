/**
 * Contrato de un lead de Jeipy AI entre el asistente (cliente) y el backend.
 * El cliente envía una `LeadSubmission`; el servidor la valida y la convierte en `LeadRecord`.
 */
import type { AiLevel, AiTierId, Feature, Goal, PlanId, WebsiteStatus } from "@/features/assistant/types";

/** Qué pidió el cliente al dejar sus datos. */
export type LeadIntent = "quote" | "callback";

/** Clasificación interna para el equipo. Nunca se muestra al cliente. */
export type LeadStatus = "nuevo" | "interesado" | "cotizacion" | "solicita-llamada";

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
  website?: WebsiteStatus;
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

/** Respuesta de POST /api/leads. `ok` solo es true si el lead quedó guardado o notificado de verdad. */
export type LeadSubmitResult =
  | { ok: true; stored: boolean; notified: boolean }
  | { ok: false; error: "invalid" | "rate-limited" | "not-configured" | "failed" };
