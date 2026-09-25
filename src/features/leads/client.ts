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
      if (message.role === "user") return { role: "user", text: message.text.slice(0, 1_000) };
      const text = message.blocks.map(blockText).filter(Boolean).join("\n");
      return text ? { role: "assistant", text: text.slice(0, 1_000) } : null;
    })
    .filter((entry): entry is TranscriptEntry => entry !== null)
    .slice(-60);
}

type Payload = LeadDraft & { transcript?: TranscriptEntry[] };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function post(payload: Payload): Promise<LeadSubmitResult> {
  let lastError: unknown;
  // Un reintento rápido si la red del cliente falla antes de llegar al servidor
  // (los reintentos contra la base de datos los hace el servidor).
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        // El servidor reintenta Supabase (~15 s máx.); el navegador nunca se queda esperando indefinidamente.
        signal: AbortSignal.timeout(25_000),
      });
      const result = (await response.json().catch(() => null)) as LeadSubmitResult | null;
      // Éxito solo con la confirmación del servidor (id del lead guardado en la base de datos).
      if (response.ok && result?.ok && result.id) return result;
      const failure = result && !result.ok ? result : { ok: false as const, error: "failed" as const };
      console.error(
        `[Jeipy AI] No se pudo enviar la solicitud (${response.status} · ${failure.error}${failure.requestId ? ` · ref ${failure.requestId}` : ""}${failure.backup === "email" ? " · llegó por correo de respaldo" : ""}).`,
      );
      return failure;
    } catch (error) {
      lastError = error;
      if (attempt === 1) await sleep(1_500);
    }
  }
  console.error("[Jeipy AI] No se pudo contactar al servidor para enviar la solicitud.", lastError);
  return { ok: false, error: "failed", backup: "none" };
}

/* ---------------------------------------------------------------
   Respaldo en el navegador: si el envío falla, los datos se guardan
   temporalmente aquí y se reintentan hasta que el servidor confirme.
   --------------------------------------------------------------- */

const PENDING_KEY = "jeipy-ai:pending-lead";
const PENDING_TTL_MS = 72 * 3_600_000;
export const LEAD_SYNCED_EVENT = "jeipy-ai:lead-synced";

type Pending = { payload: Payload; savedAt: number; attempts: number };

function readPending(): Pending | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const pending = JSON.parse(raw) as Pending;
    if (Date.now() - pending.savedAt > PENDING_TTL_MS) {
      localStorage.removeItem(PENDING_KEY);
      return null;
    }
    return pending;
  } catch {
    return null;
  }
}

function writePending(pending: Pending | null) {
  try {
    if (pending) localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
    else localStorage.removeItem(PENDING_KEY);
  } catch {
    /* sin almacenamiento local: solo queda el reintento manual */
  }
}

export const hasPendingLead = () => readPending() !== null;

/** El lead quedó asegurado: en la base de datos, o en un canal de respaldo (correo o webhook). */
export const isLeadSecured = (result: LeadSubmitResult) => result.ok || result.backup === "email" || result.backup === "webhook";

/**
 * Envía el lead. Si la base de datos no lo confirmó (aunque un respaldo sí), lo deja guardado en
 * el navegador para completar el registro después, sin volver a enviar el respaldo.
 */
export async function submitLead(lead: LeadDraft, messages: ChatMessage[]): Promise<LeadSubmitResult> {
  const payload: Payload = { ...lead, transcript: toTranscript(messages) };
  const result = await post(payload);
  if (result.ok) writePending(null);
  else if (result.error !== "invalid") {
    const previous = readPending();
    writePending({
      payload: { ...payload, backupNotified: result.backup === "email" || result.backup === "webhook" || previous?.payload.backupNotified },
      savedAt: previous?.savedAt ?? Date.now(),
      attempts: (previous?.attempts ?? 0) + 1,
    });
  }
  return result;
}

/**
 * Reintenta en segundo plano un lead guardado en el navegador. Al confirmarse, lo borra y
 * avisa con el evento `jeipy-ai:lead-synced` (el chat, si está abierto, lo muestra).
 */
export async function retryPendingLead(): Promise<LeadSubmitResult | null> {
  const pending = readPending();
  if (!pending) return null;
  const result = await post(pending.payload);
  if (result.ok) {
    writePending(null);
    window.dispatchEvent(new CustomEvent(LEAD_SYNCED_EVENT, { detail: { conversationId: pending.payload.conversationId } }));
  } else if (result.error === "invalid") {
    writePending(null);
  } else {
    writePending({
      ...pending,
      attempts: pending.attempts + 1,
      payload: { ...pending.payload, backupNotified: pending.payload.backupNotified || result.backup === "email" || result.backup === "webhook" },
    });
  }
  return result;
}

/**
 * Última oportunidad al cerrar la pestaña: si hay un lead pendiente, se envía con sendBeacon
 * (el navegador lo despacha aunque la página se cierre). Guardar es idempotente, así que no
 * duplica; el pendiente se conserva hasta confirmar en la próxima visita.
 */
export function beaconPendingLead(): void {
  const pending = readPending();
  if (!pending || typeof navigator === "undefined" || !navigator.sendBeacon) return;
  try {
    navigator.sendBeacon("/api/leads", new Blob([JSON.stringify(pending.payload)], { type: "application/json" }));
  } catch {
    /* sin beacon: queda el reintento en la próxima visita */
  }
}
