"use client";

import { ArrowIcon } from "@/components/icons/ArrowIcon";
import { CheckIcon, ChannelIcon } from "@/components/icons/BrandIcons";
import { isWhatsAppConfigured, getContactHref } from "@/lib/contact";
import { cn } from "@/lib/cn";
import { getAiTier, getPlan } from "../knowledge";
import type { MessageBlock } from "../types";
import { InlineBold, RichText } from "./RichText";

export type BlockActions = {
  onSend: (text: string) => void;
  onNavigate: (href: string) => void;
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
    case "closing":
      return <ClosingOptions block={block} actions={actions} />;
    case "lead-status":
      return <LeadStatus block={block} />;
    default:
      return null;
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
  const aiTier = block.aiTier ? getAiTier(block.aiTier) : undefined;
  return (
    <div className="jp-gradient-border relative overflow-hidden rounded-2xl bg-[linear-gradient(165deg,#0e1a33,#0a1224_55%,#080b12)] p-4">
      <div aria-hidden className="absolute -top-10 -right-10 size-28 rounded-full bg-jeipy/25 blur-2xl" />
      <div className="relative">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-glow">Tu recomendación está lista</p>
        <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
          <span className="text-lg font-semibold tracking-[-0.02em] text-snow">
            Plan {plan.name}
            {aiTier && <span className="text-glow"> + {aiTier.name}</span>}
          </span>
          <span className="text-[13px] text-mist">
            web desde {plan.price} {plan.currency}
            {aiTier && ` · IA aparte, desde ${aiTier.setup.price} + mensualidad`}
          </span>
        </p>

        <p className="mt-3 text-[12px] font-medium text-mist/90">Por lo que me contaste</p>
        <ul className="mt-1.5 space-y-1">
          {block.because.map((item) => (
            <li key={item} className="flex gap-2 text-[13px] leading-snug text-snow/85">
              <span aria-hidden className="mt-[0.55em] size-1 shrink-0 rounded-full bg-glow/80" />
              {item}
            </li>
          ))}
        </ul>

        <p className="mt-3 text-[12px] font-medium text-mist/90">Qué cubre</p>
        <ul className="mt-1.5 space-y-1.5">
          {block.covers.map((item) => (
            <li key={item} className="flex gap-2 text-[13px] leading-snug text-snow/85">
              <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-jeipy/20 text-glow">
                <CheckIcon className="size-2.5" />
              </span>
              {item}
            </li>
          ))}
        </ul>

        {block.alternative && (
          <p className="mt-3 border-t border-white/[0.07] pt-3 text-[13px] leading-snug text-mist">
            <span className="mr-1.5 font-medium text-snow/80">Qué cambiaría:</span>
            {block.alternative}
          </p>
        )}
        {block.notes?.map((note) => (
          <p key={note} className="mt-2 text-[12px] leading-snug text-mist/75">
            {note}
          </p>
        ))}

        <p className="mt-3 text-[11px] text-mist/60">Recomendación orientativa: el alcance final se confirma con el equipo.</p>
        <button
          type="button"
          onClick={() => actions.onNavigate("#planes")}
          className="group mt-3 inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong px-3.5 text-[13px] text-snow transition-colors hover:border-glow/40"
        >
          Ver plan
          <ArrowIcon className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={className}>
      <path
        d="M5.2 2.5H3.6c-.6 0-1.1.5-1 1.1.5 5.1 4.5 9.1 9.6 9.6.6.1 1.1-.4 1.1-1v-1.6c0-.4-.3-.8-.7-.9l-2-.6c-.3-.1-.7 0-.9.3l-.7.9a8 8 0 0 1-3.6-3.6l.9-.7c.3-.2.4-.6.3-.9l-.6-2c-.1-.4-.5-.7-.9-.7Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * "¿Cómo quieres continuar?": las dos salidas principales tienen el mismo peso visual.
 * El asesor abre WhatsApp con un mensaje breve; si no hay número configurado, lo pide al asistente.
 */
function ClosingOptions({ block, actions }: { block: Extract<MessageBlock, { type: "closing" }>; actions: BlockActions }) {
  const whatsapp = isWhatsAppConfigured();
  const option =
    "group flex w-full items-center gap-3 rounded-2xl border border-glow/25 bg-jeipy/[0.07] px-4 py-3.5 text-left transition-[background-color,border-color] duration-300 hover:border-glow/50 hover:bg-jeipy/[0.13]";
  const iconTile = "grid size-9 shrink-0 place-items-center rounded-xl bg-jeipy/20 text-glow ring-1 ring-glow/25";

  const advisorContent = (
    <>
      <span className={iconTile}>
        <ChannelIcon name="whatsapp" className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-medium text-snow">Hablar ahora con un asesor</span>
        <span className="block text-xs leading-snug text-mist">
          {whatsapp ? "Continúa por WhatsApp para resolver dudas o avanzar con el proyecto." : "Una persona del equipo te ayuda a resolver dudas o avanzar."}
        </span>
      </span>
      <ArrowIcon className="size-4 shrink-0 text-glow" />
    </>
  );

  return (
    <div>
      <p className="text-[14px] font-medium text-snow">{block.title}</p>
      <div className="mt-2.5 space-y-2">
        {whatsapp ? (
          <a href={getContactHref(block.whatsappMessage)} target="_blank" rel="noopener noreferrer" className={option}>
            {advisorContent}
          </a>
        ) : (
          <button type="button" onClick={() => actions.onSend("Quiero hablar con un asesor")} className={option}>
            {advisorContent}
          </button>
        )}
        {block.offerCallback && (
          <button type="button" onClick={() => actions.onSend("Quiero que me llamen")} className={option}>
            <span className={iconTile}>
              <PhoneIcon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-medium text-snow">Quiero que me llamen</span>
              <span className="block text-xs leading-snug text-mist">Deja o confirma tu número y el equipo de Jeipy te llama.</span>
            </span>
            <ArrowIcon className="size-4 shrink-0 text-glow" />
          </button>
        )}
        <button
          type="button"
          onClick={() => actions.onSend("Tengo otra duda")}
          className="w-full rounded-full px-4 py-2 text-center text-[13px] text-mist transition-colors hover:text-snow"
        >
          Tengo otra duda
        </button>
      </div>
    </div>
  );
}

/** Resultado real del envío: confirma solo lo que el backend confirmó. */
function LeadStatus({ block }: { block: Extract<MessageBlock, { type: "lead-status" }> }) {
  return (
    <div
      role="status"
      className={cn(
        "flex gap-3 rounded-2xl border p-4",
        block.ok ? "border-glow/30 bg-[linear-gradient(165deg,rgb(23_105_255/0.16),rgb(10_18_36/0.6))]" : "border-line-strong bg-white/[0.03]",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-full",
          block.ok ? "bg-jeipy text-white shadow-[0_6px_20px_-6px_rgb(23_105_255/0.8)]" : "bg-white/[0.06] text-snow",
        )}
      >
        {block.ok ? <CheckIcon className="size-3.5" /> : <span className="text-sm font-semibold leading-none">!</span>}
      </span>
      <div>
        <p className="text-[15px] font-semibold tracking-[-0.01em] text-snow">{block.title}</p>
        <p className="mt-1 text-[13.5px] leading-relaxed text-mist">{block.text}</p>
      </div>
    </div>
  );
}
