"use client";

import { m, useReducedMotion } from "framer-motion";
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { assistantConfig } from "@/config/assistant";
import { cn } from "@/lib/cn";
import { easeJeipy } from "@/lib/motion";
import type { ChatMessage } from "../types";
import { useAssistant } from "../useAssistant";
import { AssistantOrb } from "./AssistantOrb";
import { MessageBlocks, type BlockActions } from "./MessageBlocks";

/**
 * Apertura y cierre con `transform` como una sola cadena: Framer Motion lo anima con WAAPI en el
 * compositor, así la animación sigue fluida aunque el hilo principal esté ocupado montando el historial.
 * (`y` y `scale` por separado se calculan cuadro a cuadro en JavaScript.)
 */
const PANEL_MOTION = {
  initial: { opacity: 0, transform: "translateY(16px) scale(0.97)" },
  animate: { opacity: 1, transform: "translateY(0px) scale(1)" },
  exit: { opacity: 0, transform: "translateY(12px) scale(0.98)", transition: { duration: 0.2 } },
};
/** Con "reducir movimiento" solo se funde (MotionConfig no omite `transform` escrito como cadena). */
const PANEL_MOTION_REDUCED = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

type AssistantPanelProps = {
  onClose: () => void;
  /** Mensaje enviado desde un CTA externo; se envía una sola vez por id. */
  request?: { id: number; message: string };
  onRequestHandled?: () => void;
};

export function AssistantPanel({ onClose, request, onRequestHandled }: AssistantPanelProps) {
  const assistant = useAssistant();
  const { messages, quickReplies, status } = assistant;
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const thinking = status === "thinking" || status === "sending";
  const empty = messages.length === 0;
  const motionProps = useReducedMotion() ? PANEL_MOTION_REDUCED : PANEL_MOTION;
  // Mensajes que ya existían al abrir el panel: se muestran quietos, sin animación de entrada.
  const [seen] = useState(() => new Set(messages.map((message) => message.id)));

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  const handledRequest = useRef<number>(undefined);
  const { send: sendMessage } = assistant;
  useEffect(() => {
    if (!request || thinking || handledRequest.current === request.id) return;
    handledRequest.current = request.id;
    void sendMessage(request.message);
    onRequestHandled?.();
  }, [request, thinking, sendMessage, onRequestHandled]);

  // Al abrir, el panel aparece ya en lo último de la conversación (sin recorrer el historial).
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  // Mensajes nuevos: desplazamiento suave hasta lo último.
  const progress = `${messages.length}:${thinking}`;
  const lastProgress = useRef(progress);
  useEffect(() => {
    if (lastProgress.current === progress) return;
    lastProgress.current = progress;
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [progress]);

  const send = (text: string) => {
    if (text === "Reintentar" && status === "error") return assistant.retry();
    void assistant.send(text);
    setDraft("");
    inputRef.current?.focus({ preventScroll: true });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send(draft);
    }
  };

  // Acciones estables: escribir en la caja de texto no vuelve a renderizar el historial.
  const sendRef = useRef(send);
  useLayoutEffect(() => {
    sendRef.current = send;
  });
  const blockActions = useMemo<BlockActions>(
    () => ({
      onSend: (text) => sendRef.current(text),
      onNavigate: (href) => {
        onClose();
        document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
      },
    }),
    [onClose],
  );

  return (
    <m.div
      id="jeipy-ai-panel"
      role="dialog"
      aria-label={assistantConfig.name}
      {...motionProps}
      transition={{ duration: 0.4, ease: easeJeipy }}
      style={{ transformOrigin: "bottom right" }}
      className={cn(
        // Móvil: panel flotante que deja ver un poco la página (margen de 8 px y respiro arriba),
        // respetando las safe areas del iPhone. La conversación hace scroll por dentro.
        "fixed inset-x-2 top-[max(3.75rem,calc(env(safe-area-inset-top)+2.5rem))] bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] z-[60] flex flex-col overflow-hidden",
        "rounded-[1.75rem] border border-line-strong",
        "sm:inset-auto sm:right-6 sm:bottom-24 sm:h-[min(40rem,calc(100dvh-8rem))] sm:w-[25rem] sm:rounded-3xl",
        "bg-[linear-gradient(180deg,#0b1222,#070a11_40%)] shadow-[0_40px_120px_-30px_rgb(0_0_0/0.9),0_0_0_1px_rgb(0_0_0/0.4),0_20px_60px_-30px_rgb(23_105_255/0.45)]",
      )}
    >
      {/* Cabecera */}
      <header className="relative flex items-center gap-3 border-b border-line px-3.5 py-3 sm:px-4 sm:py-3.5">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-20 h-40 bg-[radial-gradient(closest-side,rgb(23_105_255/0.25),transparent)]" />
        <AssistantOrb state={thinking ? "thinking" : "idle"} className="relative size-9 sm:size-10" />
        <div className="relative min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-snow">
            {assistantConfig.name}
            {assistantConfig.prototype && (
              <span className="rounded-full border border-line-strong px-1.5 py-px font-mono text-[9px] font-normal uppercase tracking-wider text-mist">
                Prototipo
              </span>
            )}
          </p>
          <p className="flex items-center gap-1.5 text-xs text-glow" aria-live="polite">
            <span aria-hidden className={cn("size-1.5 rounded-full bg-glow", thinking ? "animate-jp-pulse" : "opacity-80")} />
            {status === "sending" ? "Enviando tu solicitud…" : thinking ? "Analizando…" : assistantConfig.status}
          </p>
        </div>
        {!empty && (
          <button
            type="button"
            onClick={assistant.reset}
            aria-label="Empezar una nueva conversación"
            title="Nueva conversación"
            className="relative grid size-9 place-items-center rounded-full text-mist transition-colors hover:bg-white/5 hover:text-snow"
          >
            <svg viewBox="0 0 16 16" fill="none" aria-hidden className="size-4">
              <path d="M2.5 8a5.5 5.5 0 1 0 1.7-4M2.5 2.5V5.5h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar Jeipy AI"
          className="relative grid size-9 place-items-center rounded-full text-mist transition-colors hover:bg-white/5 hover:text-snow"
        >
          <svg viewBox="0 0 16 16" fill="none" aria-hidden className="size-4">
            <path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      {/* Conversación */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 py-4 sm:px-4 sm:py-5" aria-live="polite" aria-relevant="additions">
        {empty ? (
          <Welcome />
        ) : (
          <MessageList messages={messages} seen={seen} thinking={thinking} actions={blockActions} />
        )}

        {!thinking && quickReplies.length > 0 && (
          <div className={cn("flex flex-wrap gap-2", empty ? "mt-6 flex-col" : "mt-4 pl-8")}>
            {quickReplies.map((reply) => (
              <button
                key={reply}
                type="button"
                onClick={() => send(reply)}
                className={cn(
                  "group rounded-full border border-glow/25 bg-jeipy/[0.07] px-3.5 py-2 text-left text-[13px] text-snow/90 transition-[background-color,border-color,color] duration-300 hover:border-glow/50 hover:bg-jeipy/15 hover:text-snow",
                  empty && "flex items-center justify-between rounded-2xl px-4 py-3 text-[14px]",
                )}
              >
                {reply}
                {empty && (
                  <svg viewBox="0 0 16 16" fill="none" aria-hidden className="jp-arrow size-4 text-glow">
                    <path d="M3 8h9.5M8.5 3.5 13 8l-4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Entrada */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          send(draft);
        }}
        className="border-t border-line px-2.5 pt-2.5 pb-2.5 sm:px-3 sm:pt-3 sm:pb-3"
      >
        <div className="flex items-end gap-2 rounded-2xl border border-line-strong bg-white/[0.03] p-1.5 pl-3.5 transition-colors focus-within:border-glow/45">
          <label htmlFor="jeipy-ai-input" className="sr-only">
            Escribe tu mensaje
          </label>
          <textarea
            id="jeipy-ai-input"
            ref={inputRef}
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Cuéntame sobre tu negocio…"
            className="max-h-28 min-h-9 flex-1 resize-none bg-transparent py-2 text-[14px] text-snow placeholder:text-mist/60 focus:outline-none [field-sizing:content]"
          />
          <button
            type="submit"
            disabled={!draft.trim() || thinking}
            aria-label="Enviar mensaje"
            className="grid size-9 shrink-0 place-items-center rounded-xl bg-jeipy text-white transition-[background-color,opacity] hover:bg-[#2a76ff] disabled:opacity-35"
          >
            <svg viewBox="0 0 16 16" fill="none" aria-hidden className="size-4">
              <path d="M8 13V3.5M3.5 8 8 3.5 12.5 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <p className="mt-1.5 text-center text-[11px] text-mist/60 sm:mt-2">Recomendaciones orientativas. El alcance final se confirma con el equipo.</p>
      </form>
    </m.div>
  );
}

function Welcome() {
  return (
    <div className="flex flex-col items-center pt-4 text-center">
      <div className="relative">
        <div aria-hidden className="absolute inset-0 -z-10 scale-150 rounded-full bg-jeipy/25 blur-2xl" />
        <AssistantOrb className="size-16" />
      </div>
      <p className="mt-5 text-lg font-semibold tracking-[-0.02em] text-snow">Hola, soy {assistantConfig.name}.</p>
      <p className="mt-2 max-w-[18rem] text-[14px] leading-relaxed text-mist">
        Cuéntame sobre tu negocio y te ayudo a encontrar la solución digital que realmente necesitas.
      </p>
    </div>
  );
}

/**
 * Historial de la conversación. Memorizado: solo se vuelve a renderizar cuando cambian los mensajes
 * o el estado "pensando", no con cada tecla que se escribe.
 */
const MessageList = memo(function MessageList({
  messages,
  seen,
  thinking,
  actions,
}: {
  messages: ChatMessage[];
  seen: ReadonlySet<string>;
  thinking: boolean;
  actions: BlockActions;
}) {
  return (
    <ol className="space-y-4 sm:space-y-5">
      {messages.map((message) => (
        <m.li
          key={message.id}
          // El historial ya visto aparece quieto; solo se animan los mensajes nuevos.
          initial={seen.has(message.id) ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: easeJeipy }}
          className={cn("flex gap-2.5", message.role === "user" && "justify-end")}
        >
          {message.role === "assistant" ? (
            <>
              <AssistantOrb still className="mt-0.5 size-6" />
              <div className="min-w-0 flex-1">
                <MessageBlocks blocks={message.blocks} actions={actions} />
              </div>
            </>
          ) : (
            <p className="max-w-[85%] rounded-2xl rounded-br-md bg-jeipy px-3.5 py-2.5 text-[14px] leading-relaxed text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.15)]">
              {message.text}
            </p>
          )}
        </m.li>
      ))}
      {thinking && (
        <li className="flex items-center gap-2.5" aria-label="Jeipy AI está analizando">
          <AssistantOrb state="thinking" className="size-6" />
          <span className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className="jp-typing-dot size-1.5 rounded-full bg-glow" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </span>
        </li>
      )}
    </ol>
  );
});
