import type { JeipyAiTierId } from "@/data/jeipyAi";
import type { Plan } from "@/data/plans";
import type { ContactChannel, LeadIntent, LeadSubmission } from "@/features/leads/types";
import type { Tier } from "./ladder";

export type PlanId = Plan["id"];
export type AiTierId = JeipyAiTierId;

/* ---------------------------------------------------------------
   Perfil del visitante: lo que el asistente va entendiendo.
   --------------------------------------------------------------- */

export type Goal = "clients" | "image" | "showcase" | "sell" | "automate";
/** Canales donde el negocio ya tiene presencia (varios a la vez). */
export type DigitalChannel =
  | "whatsapp"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "google_business"
  | "website"
  | "ecommerce"
  | "other"
  | "none";

/** Estado de la página web actual del negocio. */
export type WebsiteStatus = "none" | "existing" | "outdated" | "needs_improvement";
/**
 * Capacidades que puede necesitar el negocio.
 * `automation`: cotizaciones automatizadas, clasificación o seguimiento de clientes, flujos y procesos comerciales.
 */
export type Feature = "catalog" | "booking" | "forms" | "ai" | "integrations" | "seo" | "automation";

/**
 * Nivel de IA que necesita el visitante:
 * - basic: responder dudas, explicar servicios, orientar y captar datos básicos (Esencial + Jeipy AI Lite).
 * - advanced: reservas, cotizaciones, clasificación de leads o procesos automatizados (Premium + Jeipy AI Pro).
 */
export type AiLevel = "basic" | "advanced";

/** `true` lo quiere, `false` lo descartó, ausente = aún no se sabe. */
export type FeatureMap = Partial<Record<Feature, boolean>>;

export type Budget = { amount: number } | "skipped";

export type Profile = {
  /** Rubro, en palabras simples ("venta de calzado", "ferretería"); puede ser cualquier negocio. */
  businessType?: string;
  /** Lo que el visitante contó sobre qué vende o cómo funciona, con sus palabras. */
  businessDescription?: string;
  /** Presencia digital actual (existingDigitalChannels). */
  channels?: DigitalChannel[];
  websiteStatus?: WebsiteStatus;
  goal?: Goal;
  features: FeatureMap;
  budget?: Budget;
  aiLevel?: AiLevel;
  /** Nivel de Jeipy AI que el visitante pidió de forma explícita (p. ej. desde un CTA). */
  aiTier?: AiTierId;
  /** Datos de contacto, solo si el visitante decide dejarlos. */
  name?: string;
  phone?: string;
  email?: string;
  /** Nombre comercial del negocio (el tipo va en `businessType`). */
  businessName?: string;
  preferredChannel?: ContactChannel;
  /** Horario preferido para la llamada, en palabras del visitante. */
  preferredTime?: string;
};

/* ---------------------------------------------------------------
   Conversación
   --------------------------------------------------------------- */

/** Dato que el asistente está esperando como respuesta a su última pregunta. */
export type Slot =
  | { kind: "businessType" }
  | { kind: "website" }
  | { kind: "goal" }
  | { kind: "feature"; feature: Feature }
  | { kind: "budget" }
  /** Pregunta de desempate entre Esencial + Jeipy AI y Premium. */
  | { kind: "aiLevel" }
  | { kind: "name" }
  | { kind: "phone" }
  | { kind: "email" }
  | { kind: "businessName" }
  | { kind: "channel" }
  | { kind: "preferredTime" }
  /** Confirmar nombre y teléfono ya conocidos antes de pedir la llamada. */
  | { kind: "confirm-contact" }
  /** Autorización para que Jeipy contacte al visitante. */
  | { kind: "consent" }
  /** Confirmación de una alternativa más económica (`tier`) frente a la que tenía (`from`). */
  | { kind: "confirm-plan"; tier: Tier; from: Tier };

/**
 * free: conversación abierta · advisor: diagnóstico para recomendar ·
 * quote: diagnóstico + presupuesto + datos de contacto · lead: datos para la cotización ·
 * callback: datos para que un asesor llame.
 */
export type Flow = "free" | "advisor" | "quote" | "lead" | "callback";

export type ConversationState = {
  /** Identifica la conversación: las solicitudes sucesivas actualizan el mismo lead. */
  conversationId: string;
  flow: Flow;
  expecting: Slot | null;
  profile: Profile;
  recommended?: PlanId;
  /** Nivel de Jeipy AI sugerido junto al plan recomendado. */
  recommendedAi?: AiTierId;
  /** Nivel máximo que el visitante aceptó tras una objeción: las siguientes recomendaciones lo respetan. */
  planCap?: Tier;
  /** Los dos niveles de los que se está hablando, para entender "¿y la diferencia entre esos dos?". */
  comparePair?: [Tier, Tier];
  /** El cliente ya vio las opciones de contacto (se ofrecen una sola vez al cerrar la cotización). */
  handoffOffered: boolean;
  /** Preguntas que el visitante prefirió no responder: no se repiten. */
  skipped: string[];
  /** Intentos fallidos de entender la respuesta a la pregunta actual. */
  retries: number;
  /** El backend confirmó que el lead quedó registrado (guardado o notificado). */
  leadCaptured: boolean;
  /** Qué pidió el visitante al dejar sus datos. */
  leadIntent?: LeadIntent;
  callbackRequested: boolean;
  /** Ya autorizó ser contactado en esta conversación. */
  consentGiven: boolean;
  /** Hay un envío autorizado pendiente o fallido (permite reintentar). */
  pendingSubmission: boolean;
};

export type MessageBlock =
  | { type: "text"; text: string }
  | { type: "list"; items: string[] }
  | {
      type: "recommendation";
      planId: PlanId;
      /** Nivel de Jeipy AI sugerido como complemento (se contrata aparte del plan web). */
      aiTier?: AiTierId;
      /** Respuestas del visitante que llevaron a la recomendación. */
      because: string[];
      /** Qué cubre el plan recomendado. */
      covers: string[];
      /** Qué tendría que cambiar para que otro plan tuviera más sentido. */
      alternative?: string;
      notes?: string[];
    }
  | { type: "summary"; title: string; rows: { label: string; value: string }[] }
  /** "¿Cómo quieres continuar?": asesor por WhatsApp, solicitud de llamada y otra duda. */
  | { type: "closing"; title: string; whatsappMessage: string; offerCallback: boolean }
  /** Resultado real del envío del lead al backend. */
  | { type: "lead-status"; ok: boolean; title: string; text: string };

export type ChatMessage =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; blocks: MessageBlock[] };

/** Lead listo para enviar; el historial lo añade `useAssistant`. */
export type LeadDraft = Omit<LeadSubmission, "transcript">;

/** Efectos que el motor pide ejecutar fuera de la conversación (enviar al backend…). */
export type AssistantEffect = { type: "submit-lead"; lead: LeadDraft };

export type AssistantTurn = {
  blocks: MessageBlock[];
  quickReplies?: string[];
  state: ConversationState;
  effects?: AssistantEffect[];
};

/**
 * Contrato del "cerebro" del asistente. Hoy lo implementa el motor local de reglas;
 * mañana, un modelo de IA con la misma forma de entrada y salida.
 */
export interface AssistantBrain {
  reply(input: string, state: ConversationState, history: ChatMessage[]): Promise<AssistantTurn>;
}

const createConversationId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

export const initialConversationState = (): ConversationState => ({
  conversationId: createConversationId(),
  flow: "free",
  expecting: null,
  profile: { features: {} },
  handoffOffered: false,
  skipped: [],
  retries: 0,
  leadCaptured: false,
  callbackRequested: false,
  consentGiven: false,
  pendingSubmission: false,
});
