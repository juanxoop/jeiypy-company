"use client";

import { AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { assistantConfig } from "@/config/assistant";
import { cn } from "@/lib/cn";
import { AssistantOrb } from "./AssistantOrb";

/** El panel (conversación + motor) se descarga solo cuando el visitante muestra interés. */
const loadPanel = () => import("./AssistantPanel").then((mod) => mod.AssistantPanel);
const AssistantPanel = dynamic(loadPanel, { ssr: false });

/**
 * Widget flotante de Jeipy AI: orbe con personalidad propia que abre el asistente.
 */
export function AssistantLauncher() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    buttonRef.current?.focus({ preventScroll: true });
  }, []);

  // Escape cierra; en móvil el panel ocupa la pantalla y bloquea el scroll de fondo.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    const fullscreen = window.matchMedia("(max-width: 639px)").matches;
    if (fullscreen) document.documentElement.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (fullscreen) document.documentElement.style.overflow = "";
    };
  }, [open, close]);

  return (
    <>
      <div
        className={cn(
          "jp-enter fixed right-4 bottom-4 z-40 sm:right-6 sm:bottom-6",
          open && "max-sm:pointer-events-none max-sm:opacity-0",
        )}
        style={{ "--enter-delay": 900 } as React.CSSProperties}
      >
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen((value) => !value)}
          onPointerEnter={() => void loadPanel()}
          onFocus={() => void loadPanel()}
          aria-expanded={open}
          aria-controls="jeipy-ai-panel"
          aria-label={open ? `Cerrar ${assistantConfig.name}` : `Abrir ${assistantConfig.name}, ${assistantConfig.status.toLowerCase()}`}
          className="group relative flex items-center"
        >
          {/* Etiqueta que aparece al pasar el cursor (solo escritorio) */}
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute right-full mr-3 hidden translate-x-2 items-center gap-2 rounded-full border border-line-strong bg-ink-blue/90 py-2 pr-3.5 pl-3 text-[13px] whitespace-nowrap text-snow opacity-0 shadow-2xl backdrop-blur-md transition-[opacity,transform] duration-400 ease-(--ease-jeipy) sm:flex",
              !open && "group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100",
            )}
          >
            <span className="font-semibold">{assistantConfig.name}</span>
            <span className="text-mist">· {assistantConfig.launcherHint}</span>
          </span>

          <span
            className={cn(
              "relative grid size-15 place-items-center rounded-full border border-line-strong bg-[radial-gradient(circle_at_50%_35%,#0f1b33,#05070b_75%)]",
              "shadow-[0_18px_40px_-12px_rgb(0_0_0/0.8),0_0_0_1px_rgb(0_0_0/0.5),0_8px_30px_-10px_rgb(23_105_255/0.55)]",
              "transition-[transform,box-shadow,border-color] duration-500 ease-(--ease-jeipy) group-hover:-translate-y-0.5 group-hover:border-glow/40",
              "group-hover:shadow-[0_22px_44px_-12px_rgb(0_0_0/0.8),0_0_0_1px_rgb(0_0_0/0.5),0_10px_36px_-8px_rgb(23_105_255/0.75)]",
            )}
          >
            <span aria-hidden className="absolute inset-0 rounded-full border border-glow/20 animate-jp-ring" />
            {open ? (
              <svg viewBox="0 0 16 16" fill="none" aria-hidden className="size-5 text-snow">
                <path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            ) : (
              <AssistantOrb className="size-11 transition-transform duration-500 ease-(--ease-jeipy) group-hover:scale-105" />
            )}
          </span>
        </button>
      </div>

      <AnimatePresence>{open && <AssistantPanel onClose={close} />}</AnimatePresence>
    </>
  );
}
