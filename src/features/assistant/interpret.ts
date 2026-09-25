/**
 * Capa de interpretación: antes de avanzar el flujo, cada respuesta libre se clasifica según
 * la pregunta pendiente y lo que ya se sabe del visitante. Siempre conserva el texto original.
 *
 * - positive / negative / uncertain: postura ante la pregunta (ver `polarity.ts`).
 * - question: pregunta de vuelta sin tomar postura.
 * - correction: corrige algo que ya dijo ("perdón, sí tengo página").
 * - budget_objection: el precio o el alcance no le sirven, o su presupuesto es menor.
 * - free_text_information: no responde la pregunta, pero aporta datos (negocio, canales, funciones…).
 * - unknown: nada interpretable.
 */
import { budgetCorrection, detectIntent, enrichProfile, hasCorrectionMarker, isQuestion } from "./nlu";
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

  let kind: ReplyKind;
  if (intent?.type === "objection-price" || budgetChange === "lower" || (intent?.type === "objection-scope" && !answeringFeature)) kind = "budget_objection";
  else if (hasCorrectionMarker(raw)) kind = "correction";
  else if (isQuestion(raw) && !reading.polarity) kind = "question";
  // "Tengo Instagram pero no web": el "no" es un dato, no una respuesta.
  else if (reading.polarity && !(reading.bareNegation && learned)) kind = reading.polarity;
  else if (learned || intent?.type === "budget") kind = "free_text_information";
  else kind = "unknown";

  return { kind, raw, reading, learned, budgetChange };
}
