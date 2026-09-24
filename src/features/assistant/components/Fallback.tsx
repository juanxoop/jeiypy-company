"use client";

import { useState, type FormEvent } from "react";
import { ChannelIcon } from "@/components/icons/BrandIcons";
import { getCallHref, getContactHref, isWhatsAppConfigured } from "@/lib/contact";
import { cn } from "@/lib/cn";
import { submitLead } from "@/features/leads/client";
import { initialConversationState, type LeadDraft } from "../types";
import { AssistantOrb } from "./AssistantOrb";

/**
 * Contingencia de Jeipy AI: contacto directo y formulario mínimo que NO dependen del asistente.
 * Si el asistente o el servidor fallan, el cliente igual puede escribir, llamar o dejar sus datos.
 */

/** WhatsApp y llamada directa al equipo (sin pasar por el backend). */
export function ContactLinks({ whatsappMessage, className }: { whatsappMessage?: string; className?: string }) {
  const call = getCallHref();
  const whatsapp = isWhatsAppConfigured();
  const link = "inline-flex h-10 items-center gap-2 rounded-full px-4 text-[13.5px] font-medium transition-colors";
  if (!whatsapp && !call) {
    return (
      <a href="#contacto" className={cn(link, "border border-line-strong text-snow hover:border-glow/40", className)}>
        Ver opciones de contacto
      </a>
    );
  }
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {whatsapp && (
        <a href={getContactHref(whatsappMessage)} target="_blank" rel="noopener noreferrer" className={cn(link, "bg-jeipy text-white hover:bg-[#2a76ff]")}>
          <ChannelIcon name="whatsapp" className="size-4" />
          Escribir por WhatsApp
        </a>
      )}
      {call && (
        <a href={call} className={cn(link, "border border-glow/35 text-snow hover:bg-jeipy/10")}>
          Llamar ahora
        </a>
      )}
    </div>
  );
}

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "ok" } | { kind: "failed"; byEmail: boolean };

/** Formulario mínimo: nombre, teléfono y qué necesita. Usa el mismo envío real que el asistente. */
export function FallbackLeadForm() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  // Un mismo id para todos los intentos: reintentar actualiza el mismo lead, no lo duplica.
  const [conversationId] = useState(() => initialConversationState().conversationId);
  const [error, setError] = useState<string>();

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const digits = phone.replace(/\D/g, "");
    if (!name) return setError("Escribe tu nombre.");
    if (digits.length < 7 || digits.length > 15) return setError("Escribe un teléfono válido, por ejemplo 300 123 4567.");
    if (data.get("consent") !== "on") return setError("Necesitamos tu autorización para contactarte.");
    setError(undefined);
    setStatus({ kind: "sending" });

    const callback = data.get("callback") === "on";
    const need = String(data.get("need") ?? "").trim();
    const draft: LeadDraft = {
      conversationId,
      consent: true,
      name,
      phone,
      businessName: String(data.get("business") ?? "").trim() || undefined,
      businessDescription: need ? `Formulario de contingencia: ${need}` : "Formulario de contingencia (Jeipy AI no disponible)",
      channels: [],
      features: [],
      aiInterest: false,
      intent: callback ? "callback" : "quote",
      callbackRequested: callback,
      preferredChannel: callback ? "llamada" : "whatsapp",
    };
    const result = await submitLead(draft, []);
    setStatus(result.ok ? { kind: "ok" } : { kind: "failed", byEmail: !result.ok && result.backup === "email" });
  };

  if (status.kind === "ok") {
    return (
      <div role="status" className="rounded-2xl border border-glow/30 bg-jeipy/10 p-4">
        <p className="text-[15px] font-semibold text-snow">Solicitud recibida</p>
        <p className="mt-1 text-[13.5px] text-mist">Ya tenemos tus datos. Un asesor de Jeipy podrá contactarte para hablar sobre tu proyecto.</p>
      </div>
    );
  }

  const input = "h-11 w-full rounded-xl border border-line-strong bg-white/[0.03] px-3.5 text-[14px] text-snow outline-none placeholder:text-mist/60 focus:border-glow/50";
  return (
    <form onSubmit={onSubmit} className="space-y-2.5" noValidate>
      <input name="name" autoComplete="name" placeholder="Tu nombre" aria-label="Tu nombre" className={input} />
      <input name="phone" type="tel" autoComplete="tel" placeholder="Tu celular" aria-label="Tu celular" className={input} />
      <input name="business" placeholder="Nombre o tipo de negocio (opcional)" aria-label="Negocio" className={input} />
      <textarea name="need" rows={2} placeholder="¿Qué necesitas? (opcional)" aria-label="Qué necesitas" className={cn(input, "h-auto py-2.5")} />
      <label className="flex items-center gap-2 text-[13px] text-snow/90">
        <input type="checkbox" name="callback" defaultChecked className="accent-[#1769ff]" />
        Quiero que me llamen
      </label>
      <label className="flex items-start gap-2 text-[12.5px] leading-snug text-mist">
        <input type="checkbox" name="consent" className="mt-0.5 accent-[#1769ff]" />
        Autorizo a Jeipy Company a contactarme sobre esta solicitud.
      </label>
      {error && <p className="text-[13px] text-[#ff8a8a]">{error}</p>}
      {status.kind === "failed" && (
        <p role="status" className="rounded-xl border border-line-strong bg-white/[0.03] p-3 text-[13px] text-mist">
          {status.byEmail
            ? "Nuestro sistema principal tuvo una falla, pero tus datos llegaron al equipo por correo. Los guardé en este navegador para reintentar."
            : "No pudimos enviar tu solicitud. Guardé tus datos en este navegador y lo intentaremos de nuevo; también puedes escribirnos o llamarnos."}
        </p>
      )}
      <button
        type="submit"
        disabled={status.kind === "sending"}
        className="h-11 w-full rounded-full bg-jeipy text-[14px] font-medium text-white hover:bg-[#2a76ff] disabled:opacity-60"
      >
        {status.kind === "sending" ? "Enviando…" : status.kind === "failed" ? "Intentar de nuevo" : "Enviar mis datos"}
      </button>
    </form>
  );
}

/** Panel de reemplazo cuando el asistente no puede cargar o falla por completo. */
export function DegradedPanel({ onClose }: { onClose: () => void }) {
  return (
    <div
      id="jeipy-ai-panel"
      role="dialog"
      aria-label="Contacto con Jeipy"
      className={cn(
        "fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-ink",
        "sm:inset-auto sm:right-6 sm:bottom-24 sm:max-h-[min(40rem,calc(100dvh-8rem))] sm:w-[25rem] sm:rounded-3xl sm:border sm:border-line-strong sm:bg-[linear-gradient(180deg,#0b1222,#070a11_40%)]",
      )}
    >
      <header className="flex items-center gap-3 border-b border-line px-4 py-3.5">
        <AssistantOrb still className="size-9" />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-snow">Jeipy</p>
          <p className="text-xs text-mist">El asistente no está disponible ahora</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar" className="grid size-9 place-items-center rounded-full text-mist hover:bg-white/5 hover:text-snow">
          <svg viewBox="0 0 16 16" fill="none" aria-hidden className="size-4">
            <path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </header>
      <div className="space-y-4 px-4 py-5">
        <p className="text-[14px] leading-relaxed text-snow/85">
          Estamos teniendo un problema técnico, pero igual podemos ayudarte. Déjanos tus datos y el equipo te contacta, o escríbenos directamente.
        </p>
        <ContactLinks />
        <FallbackLeadForm />
      </div>
    </div>
  );
}
