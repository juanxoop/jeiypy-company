"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { assistantConfig } from "@/config/assistant";
import { localBrain } from "./engine";
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
 * - "error": la respuesta falló; se ofrece reintentar.
 */
export type AssistantStatus = "idle" | "thinking" | "error";

export type LeadData = { name: string; contact: string; note: string };

type Snapshot = {
  messages: ChatMessage[];
  quickReplies: string[];
  conversation: ConversationState;
  leadSent: boolean;
};

const STORAGE_KEY = "jeipy-ai:conversation";

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

const emptySnapshot = (): Snapshot => ({
  messages: [],
  quickReplies: [...assistantConfig.suggestions],
  conversation: initialConversationState(),
  leadSent: false,
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

  /** Muestra el formulario de contacto dentro de la conversación. */
  const requestLeadForm = useCallback(() => {
    appendAssistant(
      [
        { type: "text", text: "Perfecto. Déjame tus datos y una persona del equipo te contactará con el contexto de esta conversación." },
        { type: "lead-form" },
      ],
      [],
    );
  }, [appendAssistant]);

  const submitLead = useCallback(
    (lead: LeadData) => {
      const record = { ...lead, profile: snapshot.conversation.profile, plan: snapshot.conversation.recommended, at: new Date().toISOString() };
      try {
        const stored = JSON.parse(localStorage.getItem("jeipy-ai:leads") ?? "[]") as unknown[];
        localStorage.setItem("jeipy-ai:leads", JSON.stringify([...stored, record]));
      } catch {
        /* sin almacenamiento local disponible */
      }
      setSnapshot((s) => ({ ...s, leadSent: true }));
      appendAssistant(
        [
          {
            type: "text",
            text: assistantConfig.prototype
              ? `¡Gracias, ${lead.name.split(" ")[0]}! Guardé tus datos y el resumen de tu proyecto.\n\n**Modo prototipo:** por ahora los datos no se envían al equipo. Cuando conectemos el sistema, llegarán automáticamente.`
              : `¡Gracias, ${lead.name.split(" ")[0]}! Una persona del equipo te contactará pronto con el contexto de esta conversación.`,
          },
        ],
        ["Tengo otra duda"],
      );
    },
    [appendAssistant, snapshot.conversation],
  );

  return {
    messages: snapshot.messages,
    quickReplies: snapshot.quickReplies,
    conversation: snapshot.conversation,
    leadSent: snapshot.leadSent,
    status,
    send,
    retry,
    reset,
    requestLeadForm,
    submitLead,
  };
}
