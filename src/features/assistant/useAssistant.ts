"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { assistantConfig } from "@/config/assistant";
import { submitLead } from "@/features/leads/client";
import { leadSubmissionResult, localBrain } from "./engine";
import {
  initialConversationState,
  type AssistantBrain,
  type ChatMessage,
  type ConversationState,
  type MessageBlock,
} from "./types";

/**
 * Estados del asistente:
 * - "idle": esperando al visitante.
 * - "thinking": analizando el mensaje (el orbe se acelera).
 * - "sending": enviando la solicitud del visitante al equipo.
 * - "error": la respuesta falló; se ofrece reintentar.
 */
export type AssistantStatus = "idle" | "thinking" | "sending" | "error";

type Snapshot = {
  messages: ChatMessage[];
  quickReplies: string[];
  conversation: ConversationState;
};

/** v2: conversaciones con captación real de leads (las anteriores se descartan). */
const STORAGE_KEY = "jeipy-ai:conversation:v2";

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

const emptySnapshot = (): Snapshot => ({
  messages: [],
  quickReplies: [...assistantConfig.suggestions],
  conversation: initialConversationState(),
});

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
      if (!input || status === "thinking" || status === "sending") return;
      lastInput.current = input;

      const current = latest.current;
      const userMessage: ChatMessage = { id: createId(), role: "user", text: input };
      setSnapshot((s) => ({ ...s, messages: [...s.messages, userMessage], quickReplies: [] }));
      setStatus("thinking");

      try {
        const [turn] = await Promise.all([
          brain.reply(input, current.conversation, current.messages),
          wait(thinkingTime(input)),
        ]);
        const turnMessages: ChatMessage[] = turn.blocks.length ? [{ id: createId(), role: "assistant", blocks: turn.blocks }] : [];
        setSnapshot((s) => ({
          ...s,
          conversation: turn.state,
          messages: [...s.messages, ...turnMessages],
          quickReplies: turn.quickReplies ?? [],
        }));

        // Envío real del lead: el motor solo confirma la recepción si el backend la confirmó.
        const submission = turn.effects?.find((effect) => effect.type === "submit-lead");
        if (submission) {
          setStatus("sending");
          const result = await submitLead(submission.lead, [...current.messages, userMessage, ...turnMessages]);
          const outcome = leadSubmissionResult(turn.state, result.ok);
          setSnapshot((s) => ({
            ...s,
            conversation: outcome.state,
            messages: [...s.messages, { id: createId(), role: "assistant", blocks: outcome.blocks }],
            quickReplies: outcome.quickReplies ?? [],
          }));
        }
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
