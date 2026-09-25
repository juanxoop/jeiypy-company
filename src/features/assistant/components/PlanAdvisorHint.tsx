"use client";

import { AssistantOrb } from "./AssistantOrb";
import { openAssistant } from "../open";

/**
 * "¿No sabes cuál elegir?": abre Jeipy AI para que recomiende un plan según el negocio.
 * Sin JavaScript, el enlace lleva a la sección de contacto.
 */
export function PlanAdvisorHint() {
  return (
    <a
      href="#contacto"
      onClick={(event) => {
        event.preventDefault();
        openAssistant("¿Qué plan me conviene?");
      }}
      className="group mx-auto flex w-fit max-w-full items-center gap-3 rounded-full border border-glow/20 bg-jeipy/[0.06] py-2 pr-4 pl-2 text-left text-[13.5px] leading-snug text-snow/90 transition-colors hover:border-glow/45 hover:bg-jeipy/[0.11]"
    >
      <AssistantOrb still className="size-7 shrink-0" />
      <span>
        <span className="font-medium text-snow">¿No sabes cuál elegir?</span>{" "}
        <span className="text-mist group-hover:text-snow/85">Jeipy AI puede recomendarte la opción más adecuada según tu negocio.</span>
      </span>
      <svg viewBox="0 0 16 16" fill="none" aria-hidden className="jp-arrow size-3.5 shrink-0 text-glow">
        <path d="M3 8h9.5M8.5 3.5 13 8l-4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  );
}
