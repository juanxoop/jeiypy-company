/**
 * Abrir Jeipy AI desde cualquier parte del sitio (p. ej. los CTA de la oferta de IA),
 * opcionalmente con un primer mensaje que el asistente responde de inmediato.
 */
export const OPEN_ASSISTANT_EVENT = "jeipy-ai:open";

export type OpenAssistantDetail = { message?: string };

export function openAssistant(message?: string) {
  window.dispatchEvent(new CustomEvent<OpenAssistantDetail>(OPEN_ASSISTANT_EVENT, { detail: { message } }));
}
