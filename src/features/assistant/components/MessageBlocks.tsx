"use client";

import { useId, useState, type FormEvent } from "react";
import { ArrowIcon } from "@/components/icons/ArrowIcon";
import { CheckIcon, ChannelIcon } from "@/components/icons/BrandIcons";
import { isWhatsAppConfigured, getContactHref } from "@/lib/contact";
import { cn } from "@/lib/cn";
import { getPlan } from "../knowledge";
import type { HandoffAction, MessageBlock } from "../types";
import type { LeadData } from "../useAssistant";
import { InlineBold, RichText } from "./RichText";

export type BlockActions = {
  onSend: (text: string) => void;
  onRequestLead: () => void;
  onSubmitLead: (lead: LeadData) => void;
  onNavigate: (href: string) => void;
  leadSent: boolean;
};

export function MessageBlocks({ blocks, actions }: { blocks: MessageBlock[]; actions: BlockActions }) {
  return (
    <div className="space-y-3">
      {blocks.map((block, i) => (
        <Block key={i} block={block} actions={actions} />
      ))}
    </div>
  );
}

function Block({ block, actions }: { block: MessageBlock; actions: BlockActions }) {
  switch (block.type) {
    case "text":
      return (
        <div className="text-[14px] leading-relaxed text-snow/85">
          <RichText text={block.text} />
        </div>
      );
    case "list":
      return (
        <ul className="space-y-1.5 text-[13.5px] leading-relaxed text-mist">
          {block.items.map((item) => (
            <li key={item} className="flex gap-2.5">
              <span aria-hidden className="mt-[0.6em] size-1 shrink-0 rounded-full bg-glow/80" />
              <span>
                <InlineBold text={item} />
              </span>
            </li>
          ))}
        </ul>
      );
    case "recommendation":
      return <RecommendationCard block={block} actions={actions} />;
    case "summary":
      return (
        <div className="rounded-2xl border border-line bg-white/[0.02] p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-mist/80">{block.title}</p>
          <dl className="mt-3 space-y-1.5 text-[13px]">
            {block.rows.map((row) => (
              <div key={row.label} className="grid grid-cols-[6.5rem_1fr] gap-3">
                <dt className="text-mist/80">{row.label}</dt>
                <dd className="text-snow/90">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      );
    case "handoff":
      return <HandoffOptions actionsList={block.actions} whatsappMessage={block.whatsappMessage} actions={actions} />;
    case "lead-form":
      return <LeadForm actions={actions} />;
  }
}

function RecommendationCard({
  block,
  actions,
}: {
  block: Extract<MessageBlock, { type: "recommendation" }>;
  actions: BlockActions;
}) {
  const plan = getPlan(block.planId);
  return (
    <div className="jp-gradient-border relative overflow-hidden rounded-2xl bg-[linear-gradient(165deg,#0e1a33,#0a1224_55%,#080b12)] p-4">
      <div aria-hidden className="absolute -top-10 -right-10 size-28 rounded-full bg-jeipy/25 blur-2xl" />
      <div className="relative">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-glow">Recomendación orientativa</p>
        <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
          <span className="text-lg font-semibold tracking-[-0.02em] text-snow">Plan {plan.name}</span>
          <span className="text-[13px] text-mist">
            desde {plan.price} {plan.currency}
          </span>
        </p>

        <p className="mt-3 text-[12px] font-medium text-mist/90">Por qué</p>
        <ul className="mt-1.5 space-y-1.5">
          {block.reasons.map((reason) => (
            <li key={reason} className="flex gap-2 text-[13px] leading-snug text-snow/85">
              <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-jeipy/20 text-glow">
                <CheckIcon className="size-2.5" />
              </span>
              {reason}
            </li>
          ))}
        </ul>

        {block.alternative && (
          <p className="mt-3 border-t border-white/[0.07] pt-3 text-[13px] leading-snug text-mist">
            <span className="mr-1.5 text-glow" aria-hidden>
              ↳
            </span>
            {block.alternative}
          </p>
        )}
        {block.notes?.map((note) => (
          <p key={note} className="mt-2 text-[12px] leading-snug text-mist/75">
            {note}
          </p>
        ))}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => actions.onNavigate("#planes")}
            className="group inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong px-3.5 text-[13px] text-snow transition-colors hover:border-glow/40"
          >
            Ver plan
            <ArrowIcon className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => actions.onSend("Quiero cotizar")}
            className="group inline-flex h-9 items-center gap-1.5 rounded-full bg-jeipy px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-[#2a76ff]"
          >
            Cotizar este plan
            <ArrowIcon className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function HandoffOptions({
  actionsList,
  whatsappMessage,
  actions,
}: {
  actionsList: HandoffAction[];
  whatsappMessage: string;
  actions: BlockActions;
}) {
  const option =
    "group flex w-full items-center justify-between gap-3 rounded-xl border border-line-strong bg-white/[0.02] px-4 py-3 text-left text-[13.5px] text-snow transition-colors hover:border-glow/40 hover:bg-white/[0.04]";

  return (
    <div className="space-y-2">
      {actionsList.map((action) => {
        if (action === "lead") {
          return (
            <button key={action} type="button" disabled={actions.leadSent} onClick={actions.onRequestLead} className={cn(option, "disabled:opacity-50")}>
              <span>
                <span className="block font-medium">{actions.leadSent ? "Datos enviados" : "Dejar mis datos"}</span>
                <span className="block text-xs text-mist">Te contactamos con el resumen de esta conversación</span>
              </span>
              <ArrowIcon className="size-4 text-mist" />
            </button>
          );
        }
        if (action === "whatsapp" && isWhatsAppConfigured()) {
          return (
            <a key={action} href={getContactHref(whatsappMessage)} target="_blank" rel="noopener noreferrer" className={option}>
              <span className="flex items-center gap-3">
                <ChannelIcon name="whatsapp" className="size-4 text-glow" />
                <span>
                  <span className="block font-medium">Continuar por WhatsApp</span>
                  <span className="block text-xs text-mist">Con tu resumen ya escrito</span>
                </span>
              </span>
              <ArrowIcon className="size-4 text-mist" />
            </a>
          );
        }
        return (
          <button key={action} type="button" onClick={() => actions.onNavigate("#contacto")} className={option}>
            <span>
              <span className="block font-medium">Hablar con una persona</span>
              <span className="block text-xs text-mist">Ver las opciones de contacto</span>
            </span>
            <ArrowIcon className="size-4 text-mist" />
          </button>
        );
      })}
    </div>
  );
}

function LeadForm({ actions }: { actions: BlockActions }) {
  const id = useId();
  const [values, setValues] = useState<LeadData>({ name: "", contact: "", note: "" });
  const [error, setError] = useState<string | null>(null);

  if (actions.leadSent) {
    return <p className="text-xs text-mist">Formulario enviado.</p>;
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const contact = values.contact.trim();
    const validContact = /^\+?[\d\s-]{7,}$/.test(contact) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
    if (values.name.trim().length < 2) return setError("Escribe tu nombre.");
    if (!validContact) return setError("Escribe un número de WhatsApp o un correo válido.");
    setError(null);
    actions.onSubmitLead({ name: values.name.trim(), contact, note: values.note.trim() });
  };

  const field =
    "w-full rounded-xl border border-line-strong bg-ink/60 px-3.5 py-2.5 text-[13.5px] text-snow placeholder:text-mist/60 transition-colors focus:border-glow/50 focus:outline-none";

  return (
    <form onSubmit={submit} noValidate className="space-y-2.5 rounded-2xl border border-line bg-white/[0.02] p-4">
      <div>
        <label htmlFor={`${id}-name`} className="mb-1 block text-xs text-mist">
          Nombre
        </label>
        <input
          id={`${id}-name`}
          autoComplete="name"
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          className={field}
        />
      </div>
      <div>
        <label htmlFor={`${id}-contact`} className="mb-1 block text-xs text-mist">
          WhatsApp o correo
        </label>
        <input
          id={`${id}-contact`}
          autoComplete="tel"
          value={values.contact}
          onChange={(e) => setValues((v) => ({ ...v, contact: e.target.value }))}
          className={field}
        />
      </div>
      <div>
        <label htmlFor={`${id}-note`} className="mb-1 block text-xs text-mist">
          Algo más que debamos saber <span className="text-mist/60">(opcional)</span>
        </label>
        <textarea
          id={`${id}-note`}
          rows={2}
          value={values.note}
          onChange={(e) => setValues((v) => ({ ...v, note: e.target.value }))}
          className={cn(field, "resize-none")}
        />
      </div>
      {error && (
        <p role="alert" className="text-xs text-[#ff9b9b]">
          {error}
        </p>
      )}
      <button
        type="submit"
        className="group inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-jeipy text-[13.5px] font-medium text-white transition-colors hover:bg-[#2a76ff]"
      >
        Enviar datos
        <ArrowIcon className="size-3.5" />
      </button>
    </form>
  );
}
