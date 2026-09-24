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
    return result ?? { ok: false, error: "failed" };
  } catch {
    return { ok: false, error: "failed" };
  }
}
