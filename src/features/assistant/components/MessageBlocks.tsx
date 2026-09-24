"use client";

import { ArrowIcon } from "@/components/icons/ArrowIcon";
import { CheckIcon, ChannelIcon } from "@/components/icons/BrandIcons";
import { isWhatsAppConfigured, getContactHref } from "@/lib/contact";
import { cn } from "@/lib/cn";
import { getPlan } from "../knowledge";
import type { HandoffAction, MessageBlock } from "../types";
import { InlineBold, RichText } from "./RichText";

export type BlockActions = {
  onSend: (text: string) => void;
  onNavigate: (href: string) => void;
  /** Ya se registró un lead en esta conversación. */
  leadCaptured: boolean;
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
        {isWhatsAppConfigured() && (
          <a
            href={getContactHref(`Hola Jeipy, me interesa el plan ${plan.name}.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-mist transition-colors hover:text-snow"
          >
            <ChannelIcon name="whatsapp" className="size-3.5" />
            O continúa por WhatsApp
          </a>
        )}
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
            <button
              key={action}
              type="button"
              disabled={actions.leadCaptured}
              onClick={() => actions.onSend("Quiero dejar mis datos")}
              className={cn(option, "disabled:opacity-50")}
            >
              <span>
                <span className="block font-medium">{actions.leadCaptured ? "Datos registrados" : "Dejar mis datos"}</span>
                <span className="block text-xs text-mist">El equipo te contacta con el resumen de esta conversación</span>
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
