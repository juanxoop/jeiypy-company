/**
 * Payloads de prueba idénticos a los de producción: recorren conversaciones con el motor real de
 * Jeipy AI (`respond`) y arman el cuerpo exactamente como el navegador (`submitLead`:
 * borrador del motor + historial con `toTranscript`). Los usan la prueba automatizada
 * (scripts/test-lead-persistence.ts) y el diagnóstico de /api/health?probe=lead.
 */
import { respond } from "@/features/assistant/engine";
import { initialConversationState, type ChatMessage, type ConversationState, type LeadDraft } from "@/features/assistant/types";
import { toTranscript } from "./client";
import type { TranscriptEntry } from "./types";

export type LeadPayload = LeadDraft & { transcript?: TranscriptEntry[] };

type Contact = { name: string; phone: string; businessName: string };

/** Nombre y negocio claramente identificables como prueba. */
export const TEST_MARKER = "PRUEBA AUTOMÁTICA";

/**
 * Respuesta a lo que el motor esté preguntando: diagnóstico (respuestas neutras) y datos de contacto.
 * Con la recomendación lista y nada pendiente, el visitante elige "Quiero este plan".
 */
function nextAnswer(state: ConversationState, contact: Contact): string | undefined {
  if (!state.expecting) return state.recommended && !state.leadCaptured ? "Quiero este plan" : undefined;
  switch (state.expecting.kind) {
    case "businessType":
      return "Tienda de ropa";
    case "website":
      return "No tengo página";
    case "goal":
      return "Conseguir más clientes";
    case "feature":
      return "No";
    case "aiLevel":
      return "Solo responder dudas y captar datos";
    case "budget":
      return "Prefiero no decirlo";
    case "confirm-plan":
      return "Sí, me interesa";
    case "name":
      return contact.name;
    case "phone":
      return contact.phone;
    case "confirm-contact":
      return "Sí";
    case "email":
      return "No";
    case "businessName":
      return contact.businessName;
    case "channel":
      return "WhatsApp";
    case "preferredTime":
      return "En la tarde";
    case "consent":
      return "Sí, autorizo";
    default:
      return undefined;
  }
}

/**
 * Conversa con el motor hasta que emite el lead. Devuelve el cuerpo que el navegador enviaría a
 * POST /api/leads, o lanza un error si la conversación no llegó a enviar nada.
 */
export function payloadFromConversation(script: string[], contact: Contact, conversationId?: string): LeadPayload {
  let state: ConversationState = { ...initialConversationState(), ...(conversationId ? { conversationId } : {}) };
  const messages: ChatMessage[] = [];
  let n = 0;
  const say = (input: string): LeadDraft | undefined => {
    messages.push({ id: `u${n++}`, role: "user", text: input });
    const turn = respond(input, state);
    state = turn.state;
    if (turn.blocks.length) messages.push({ id: `a${n++}`, role: "assistant", blocks: turn.blocks });
    return turn.effects?.find((effect) => effect.type === "submit-lead")?.lead;
  };

  for (const input of script) {
    const lead = say(input);
    if (lead) return { ...lead, transcript: toTranscript(messages) };
  }
  for (let i = 0; i < 16; i++) {
    const answer = nextAnswer(state, contact);
    if (!answer) break;
    const lead = say(answer);
    if (lead) return { ...lead, transcript: toTranscript(messages) };
  }
  throw new Error(`La conversación de prueba no llegó a enviar el lead (esperando: ${state.expecting?.kind ?? "nada"}).`);
}

/**
 * Primer mensaje largo con emojis, armado para que el recorte de la descripción (280) caiga justo
 * en medio de un emoji: antes del arreglo producía un carácter inválido y Supabase rechazaba el lead.
 */
export function emojiBoundaryMessage(): string {
  const head = "Hola 👋 tengo una tienda de ropa 👗 en Medellín, vendemos por Instagram y WhatsApp 📱 ";
  const pad = "y queremos crecer con una página bonita con catálogo y precios ";
  let text = head;
  while (text.length < 279) text += pad;
  return `${text.slice(0, 279)}🚀✨ gracias!`;
}

/** Conversaciones representativas del flujo actual (Recommendation Card, alternativa, llamada, emojis). */
export function samplePayloads(tag = TEST_MARKER): { name: string; payload: LeadPayload }[] {
  const contact = (n: number): Contact => ({ name: `Prueba Automatica ${["Uno", "Dos", "Tres", "Cuatro"][n]}`, phone: `300 000 000${n}`, businessName: `${tag} ${n + 1}` });
  return [
    {
      name: "Recommendation Card → Quiero este plan",
      payload: payloadFromConversation(["Tengo una ferretería, solo uso WhatsApp y quiero mostrar mis productos.", "No", "Quiero este plan"], contact(0)),
    },
    {
      name: "Objeción → alternativa → Quiero este plan",
      payload: payloadFromConversation(
        ["Tengo una tienda de ropa, uso Instagram y TikTok y quiero más ventas.", "Sí", "No", "Me gusta pero está fuera de mi presupuesto", "Sí, me interesa", "Quiero este plan"],
        contact(1),
      ),
    },
    {
      name: "Solicitud de llamada (Premium + IA, presupuesto)",
      payload: payloadFromConversation(["Tengo una barbería y quiero más clientes", "Solo redes y WhatsApp", "Sí", "Sí", "Sí", "Tengo 6 millones", "Quiero que me llamen"], contact(2)),
    },
    {
      name: "Mensaje largo con emojis (recorte en medio de un emoji)",
      payload: payloadFromConversation([emojiBoundaryMessage()], contact(3)),
    },
  ];
}
