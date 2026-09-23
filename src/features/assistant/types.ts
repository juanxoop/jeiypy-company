import type { Plan } from "@/data/plans";

export type PlanId = Plan["id"];

/* ---------------------------------------------------------------
   Perfil del visitante: lo que el asistente va entendiendo.
   --------------------------------------------------------------- */

export type Goal = "clients" | "image" | "showcase" | "sell" | "automate";
export type WebsiteStatus = "yes" | "no" | "social";
export type Feature = "catalog" | "booking" | "forms" | "ai" | "integrations" | "seo";

/** `true` lo quiere, `false` lo descartó, ausente = aún no se sabe. */
export type FeatureMap = Partial<Record<Feature, boolean>>;

export type Budget = { amount: number } | "skipped";

export type Profile = {
  businessType?: string;
  website?: WebsiteStatus;
  goal?: Goal;
  features: FeatureMap;
  budget?: Budget;
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
  | { kind: "budget" };

export type Flow = "free" | "advisor" | "quote";

export type ConversationState = {
  flow: Flow;
  expecting: Slot | null;
  profile: Profile;
  recommended?: PlanId;
  /** El cliente ya vio las opciones de contacto (se ofrecen una sola vez al cerrar la cotización). */
  handoffOffered: boolean;
  /** Preguntas que el visitante prefirió no responder: no se repiten. */
  skipped: string[];
  /** Intentos fallidos de entender la respuesta a la pregunta actual. */
  retries: number;
};

export type HandoffAction = "whatsapp" | "lead" | "contact-section";

export type MessageBlock =
  | { type: "text"; text: string }
  | { type: "list"; items: string[] }
  | {
      type: "recommendation";
      planId: PlanId;
      reasons: string[];
      alternative?: string;
      notes?: string[];
    }
  | { type: "summary"; title: string; rows: { label: string; value: string }[] }
  | { type: "handoff"; actions: HandoffAction[]; whatsappMessage: string }
  | { type: "lead-form" };

export type ChatMessage =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; blocks: MessageBlock[] };

export type AssistantTurn = {
  blocks: MessageBlock[];
  quickReplies?: string[];
  state: ConversationState;
};

/**
 * Contrato del "cerebro" del asistente. Hoy lo implementa el motor local de reglas;
 * mañana, un modelo de IA con la misma forma de entrada y salida.
 */
export interface AssistantBrain {
  reply(input: string, state: ConversationState, history: ChatMessage[]): Promise<AssistantTurn>;
}

export const initialConversationState = (): ConversationState => ({
  flow: "free",
  expecting: null,
  profile: { features: {} },
  handoffOffered: false,
  skipped: [],
  retries: 0,
});
