/**
 * Envío del lead desde el navegador a POST /api/leads.
 * El navegador nunca ve claves ni destinatarios: solo sabe si el envío funcionó.
 */
import type { ChatMessage, LeadDraft, MessageBlock } from "@/features/assistant/types";
import type { LeadSubmitResult, TranscriptEntry } from "./types";

/** Texto legible de un mensaje del asistente, para el historial interno. */
function blockText(block: MessageBlock): string | null {
  switch (block.type) {
    case "text":
      return block.text.replace(/\*\*/g, "");
    case "list":
      return block.items.map((item) => `• ${item.replace(/\*\*/g, "")}`).join("\n");
    case "recommendation":
      return `[Recomendación: ${block.planId}${block.aiTier ? ` + Jeipy AI ${block.aiTier}` : ""}]`;
    case "summary":
      return block.rows.map((row) => `${row.label}: ${row.value}`).join("\n");
    case "lead-status":
      return `[${block.title}]`;
    default:
      return null;
  }
}

export function toTranscript(messages: ChatMessage[]): TranscriptEntry[] {
  return messages
    .map((message): TranscriptEntry | null => {
      if (message.role === "user") return { role: "user", text: message.text };
      const text = message.blocks.map(blockText).filter(Boolean).join("\n");
      return text ? { role: "assistant", text } : null;
    })
    .filter((entry): entry is TranscriptEntry => entry !== null)
    .slice(-80);
}

export async function submitLead(lead: LeadDraft, messages: ChatMessage[]): Promise<LeadSubmitResult> {
  try {
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...lead, transcript: toTranscript(messages) }),
    });
    const result = (await response.json().catch(() => null)) as LeadSubmitResult | null;
    // Éxito solo con la confirmación del servidor (id del lead guardado en la base de datos).
    if (response.ok && result?.ok && result.id) return result;
    const failure = result && !result.ok ? result : { ok: false as const, error: "failed" as const };
    console.error(`[Jeipy AI] No se pudo enviar la solicitud (${response.status} · ${failure.error}${failure.requestId ? ` · ref ${failure.requestId}` : ""}).`);
    return failure;
  } catch (error) {
    console.error("[Jeipy AI] No se pudo contactar al servidor para enviar la solicitud.", error);
    return { ok: false, error: "failed" };
  }
}
