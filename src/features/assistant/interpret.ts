/**
 * Capa de interpretación: antes de avanzar el flujo, cada respuesta libre se clasifica según
 * la pregunta pendiente y lo que ya se sabe del visitante. Siempre conserva el texto original.
 *
 * - positive / negative / uncertain: postura ante la pregunta (ver `polarity.ts`).
 * - question: pregunta de vuelta sin tomar postura.
 * - correction: corrige algo que ya dijo ("perdón, sí tengo página").
 * - budget_objection: el precio o el alcance no le sirven, o su presupuesto es menor.
 * - free_text_information: no responde la pregunta, pero aporta datos (negocio, canales, funciones…).
 * - pause: anuncia una duda o pide un momento ("bro tengo una duda", "espera", "antes de eso").
 * - clarification_request: no entendió lo que se le preguntó ("¿cómo así?").
 * - commercial_intent: quiere avanzar, que lo llamen o hablar con alguien.
 * - need_change: suma o descarta una función ("no quiero catálogo, quiero reservas").
 * - plan_reconsideration: quiere revisar o cambiar el plan ("cambiar de plan", "algo más completo").
 * - unknown: nada interpretable.
 */
import { budgetCorrection, detectIntent, enrichProfile, extractFeatures, hasCorrectionMarker, isQuestion, wantsToAsk } from "./nlu";
import { readPolarity, type PolarityReading } from "./polarity";
import type { ConversationState } from "./types";

export type ReplyKind =
  | "positive"
  | "negative"
  | "uncertain"
  | "question"
  | "correction"
  | "budget_objection"
  | "free_text_information"
  | "pause"
  | "clarification_request"
  | "commercial_intent"
  | "need_change"
  | "plan_reconsideration"
  | "unknown";

export type Interpretation = {
  kind: ReplyKind;
  /** Texto original del visitante, sin modificar. */
  raw: string;
  reading: PolarityReading;
  /** El mensaje aporta datos nuevos al perfil (además de su postura, si la tiene). */
  learned: boolean;
  budgetChange?: "lower" | "higher";
};

export function interpretReply(raw: string, state: ConversationState): Interpretation {
  const reading = readPolarity(raw);
  const intent = detectIntent(raw);
  const budgetChange = budgetCorrection(raw);
  const learned = JSON.stringify(enrichProfile(state.profile, raw)) !== JSON.stringify(state.profile);
  // "Algo más sencillo" ante "¿quieres reservas?" es un "no por ahora", no una objeción de precio.
  const answeringFeature = state.expecting?.kind === "feature";

  const profileAfter = enrichProfile(state.profile, raw);
  const featuresChanged = (Object.entries(extractFeatures(raw)) as [string, boolean][]).some(
    ([f, v]) => state.profile.features[f as keyof typeof state.profile.features] !== v && profileAfter.features[f as keyof typeof profileAfter.features] === v,
  );

  let kind: ReplyKind;
  if (intent?.type === "not-understood") kind = "clarification_request";
  else if (intent?.type === "change-plan") kind = "plan_reconsideration";
  else if (intent && ["advance", "lead", "callback", "human", "quote"].includes(intent.type)) kind = "commercial_intent";
  else if (intent?.type === "objection-price" || budgetChange === "lower" || (intent?.type === "objection-scope" && !answeringFeature)) kind = "budget_objection";
  else if (hasCorrectionMarker(raw)) kind = "correction";
  else if (isQuestion(raw) && !reading.polarity) kind = "question";
  else if (wantsToAsk(raw)) kind = "pause";
  else if (featuresChanged && !answeringFeature) kind = "need_change";
  // "Tengo Instagram pero no web": el "no" es un dato, no una respuesta.
  else if (reading.polarity && !(reading.bareNegation && learned)) kind = reading.polarity;
  else if (learned || intent?.type === "budget") kind = "free_text_information";
  else kind = "unknown";

  return { kind, raw, reading, learned, budgetChange };
}
