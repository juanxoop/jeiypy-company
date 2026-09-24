"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { assistantConfig } from "@/config/assistant";
import { localBrain } from "./engine";
import {
  initialConversationState,
  type AssistantBrain,
  type AssistantEffect,
  type ChatMessage,
  type ConversationState,
  type MessageBlock,
} from "./types";

/**
 * Estados del asistente:
 * - "idle": esperando al visitante.
 * - "thinking": analizando el mensaje (el orbe se acelera).
 * - "error": la respuesta falló; se ofrece reintentar.
 */
export type AssistantStatus = "idle" | "thinking" | "error";

type Snapshot = {
  messages: ChatMessage[];
  quickReplies: string[];
  conversation: ConversationState;
};

const STORAGE_KEY = "jeipy-ai:conversation";

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

const emptySnapshot = (): Snapshot => ({
  messages: [],
  quickReplies: [...assistantConfig.suggestions],
  conversation: initialConversationState(),
});

const LEADS_KEY = "jeipy-ai:leads";

/**
 * Ejecuta los efectos del motor. En modo prototipo los leads se guardan solo en este navegador;
 * al conectar el backend, aquí se enviarán al CRM, correo o base de datos.
 */
function runEffects(effects: AssistantEffect[] = []) {
  for (const effect of effects) {
    if (effect.type === "lead-captured") {
      try {
        const stored = JSON.parse(localStorage.getItem(LEADS_KEY) ?? "[]") as unknown[];
        localStorage.setItem(LEADS_KEY, JSON.stringify([...stored, { ...effect.lead, at: new Date().toISOString() }]));
      } catch {
        /* sin almacenamiento local disponible */
      }
    }
  }
}

function loadSnapshot(): Snapshot {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? { ...emptySnapshot(), ...(JSON.parse(raw) as Snapshot) } : emptySnapshot();
  } catch {
    return emptySnapshot();
  }
}

function thinkingTime(input: string): number {
  const { base, perCharacter, max } = assistantConfig.thinkingDelay;
  return Math.min(max, base + input.length * perCharacter);
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useAssistant(brain: AssistantBrain = localBrain) {
  // El panel solo se renderiza en el cliente, así que se puede leer sessionStorage al iniciar.
  const [snapshot, setSnapshot] = useState<Snapshot>(() => (typeof window === "undefined" ? emptySnapshot() : loadSnapshot()));
  const [status, setStatus] = useState<AssistantStatus>("idle");
  const lastInput = useRef<string>("");
  const latest = useRef(snapshot);

  // La conversación sobrevive a cerrar el panel y a recargar la página (solo en esta pestaña).
  useEffect(() => {
    latest.current = snapshot;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      /* almacenamiento no disponible: la conversación vive solo en memoria */
    }
  }, [snapshot]);

  const appendAssistant = useCallback((blocks: MessageBlock[], quickReplies: string[] = []) => {
    setSnapshot((s) => ({
      ...s,
      messages: [...s.messages, { id: createId(), role: "assistant", blocks }],
      quickReplies,
    }));
  }, []);

  const send = useCallback(
    async (rawInput: string) => {
      const input = rawInput.trim();
      if (!input || status === "thinking") return;
      lastInput.current = input;

      const current = latest.current;
      setSnapshot((s) => ({ ...s, messages: [...s.messages, { id: createId(), role: "user", text: input }], quickReplies: [] }));
      setStatus("thinking");

      try {
        const [turn] = await Promise.all([
          brain.reply(input, current.conversation, current.messages),
          wait(thinkingTime(input)),
        ]);
        runEffects(turn.effects);
        setSnapshot((s) => ({
          ...s,
          conversation: turn.state,
          messages: [...s.messages, { id: createId(), role: "assistant", blocks: turn.blocks }],
          quickReplies: turn.quickReplies ?? [],
        }));
        setStatus("idle");
      } catch {
        setStatus("error");
        appendAssistant([{ type: "text", text: "Tuve un problema al procesar tu mensaje. ¿Lo intentamos de nuevo?" }], [
          "Reintentar",
        ]);
      }
    },
    [appendAssistant, brain, status],
  );

  const retry = useCallback(() => {
    setSnapshot((s) => ({ ...s, messages: s.messages.slice(0, -2) }));
    setStatus("idle");
    const input = lastInput.current;
    setTimeout(() => void send(input), 0);
  }, [send]);

  const reset = useCallback(() => {
    setSnapshot(emptySnapshot());
    setStatus("idle");
  }, []);

  return {
    messages: snapshot.messages,
    quickReplies: snapshot.quickReplies,
    conversation: snapshot.conversation,
    status,
    send,
    retry,
    reset,
  };
}
