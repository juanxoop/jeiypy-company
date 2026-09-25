"use client";

import { ArrowIcon } from "@/components/icons/ArrowIcon";
import { CheckIcon, ChannelIcon } from "@/components/icons/BrandIcons";
import { FeatureIcon } from "@/components/icons/FeatureIcon";
import { isWhatsAppConfigured, getContactHref } from "@/lib/contact";
import { cn } from "@/lib/cn";
import { getAiTier, getPlan } from "../knowledge";
import type { MessageBlock, RecommendationBlock } from "../types";
import { ContactLinks, FallbackLeadForm } from "./Fallback";
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
    case "contact-links":
      return <ContactLinks whatsappMessage={block.whatsappMessage} />;
    case "fallback-form":
      return (
        <div className="rounded-2xl border border-line bg-white/[0.02] p-4">
          <FallbackLeadForm />
        </div>
      );
    default:
      return null;
  }
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-mist/85">{children}</p>;
}

/**
 * Recommendation Card: la recomendación de Jeipy AI distribuida en bloques cortos, en lugar de un
 * párrafo largo. Todo su contenido viene del diagnóstico de la conversación (ver recommend.ts).
 * Sus botones envían un mensaje al chat: la decisión sigue dentro de la conversación.
 */
function RecommendationCard({ block, actions }: { block: RecommendationBlock; actions: BlockActions }) {
  const plan = getPlan(block.planId);
  const aiTier = block.aiTier ? getAiTier(block.aiTier) : undefined;
  const alternative = block.variant === "alternative";
  const premium = block.planId === "premium";
  const name = `${plan.name}${aiTier ? ` + ${aiTier.name}` : ""}`;

  return (
    <section
      aria-label={`${block.title}: ${name}`}
      className={cn(
        "relative overflow-hidden rounded-2xl p-4",
        alternative
          ? "border border-line-strong bg-[linear-gradient(170deg,#101726,#0a0e16_60%)]"
          : "jp-gradient-border bg-[linear-gradient(165deg,#0e1a33,#0a1224_55%,#080b12)]",
      )}
    >
      {!alternative && <div aria-hidden className="absolute -top-10 -right-10 size-28 rounded-full bg-jeipy/25 blur-2xl" />}
      <div className="relative">
        <p className={cn("font-mono text-[10px] uppercase tracking-[0.18em]", alternative ? "text-mist" : "text-glow")}>{block.title}</p>

        {/* Plan y precio */}
        <div className="mt-2.5 flex items-center gap-3">
          <span
            aria-hidden
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-xl",
              alternative ? "border border-line-strong bg-white/[0.04] text-snow/85" : "border border-glow/30 bg-jeipy/15 text-glow",
            )}
          >
            <FeatureIcon name={plan.focus.icon} className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[19px] leading-tight font-semibold tracking-[-0.02em] text-snow">
              {plan.name}
              {aiTier && <span className="text-[15px] font-medium text-glow"> + {aiTier.name}</span>}
            </p>
            <p className="text-[13px] text-mist">
              Desde <span className="font-medium text-snow">{plan.price}</span> {plan.currency}
              {aiTier && (
                <span className="block text-[12px] leading-snug">
                  {aiTier.id === "custom"
                    ? `IA aparte: desde ${aiTier.setup.price}, según alcance e integraciones`
                    : `IA aparte: configuración desde ${aiTier.setup.price} + mensualidad según uso`}
                </span>
              )}
            </p>
          </div>
        </div>

        <p className="mt-3 border-l-2 border-glow/40 pl-3 text-[13.5px] leading-snug text-snow/90">{block.tagline}</p>

        {block.budget && (
          <p
            className={cn(
              "mt-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium",
              block.budget.fits ? "border-[#34d399]/30 bg-[#34d399]/10 text-[#a7f3d0]" : "border-[#ffb547]/35 bg-[#ffb547]/10 text-[#ffd9a0]",
            )}
          >
            {block.budget.fits ? <CheckIcon className="size-3" /> : <span aria-hidden>!</span>}
            {block.budget.text}
          </p>
        )}

        {block.because?.length ? (
          <div className="mt-4">
            <CardLabel>Por qué te lo recomiendo</CardLabel>
            <ul className="mt-2 space-y-1.5">
              {block.because.map((item) => (
                <li key={item} className="flex gap-2 text-[13.5px] leading-snug text-snow/90">
                  <span aria-hidden className="mt-[0.5em] size-1.5 shrink-0 rounded-full bg-glow" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {block.highlights?.length ? (
          <div className="mt-4">
            <CardLabel>{premium ? "Lo que automatiza para tu negocio" : "Lo más importante para tu negocio"}</CardLabel>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {block.highlights.map((h) => (
                <li
                  key={h.label}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border py-1 pr-2.5 pl-2 text-[12.5px] leading-snug text-snow/90",
                    premium ? "border-glow/30 bg-[linear-gradient(160deg,rgb(23_105_255/0.2),rgb(23_105_255/0.06))]" : "border-white/[0.08] bg-white/[0.03]",
                  )}
                >
                  <FeatureIcon name={h.icon} className="size-3.5 shrink-0 text-glow" />
                  {h.label}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {block.keeps?.length ? (
          <div className="mt-4">
            <CardLabel>Qué conservas</CardLabel>
            <ul className="mt-2 space-y-1.5">
              {block.keeps.map((item) => (
                <li key={item} className="flex gap-2 text-[13.5px] leading-snug text-snow/90">
                  <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-jeipy/20 text-glow">
                    <CheckIcon className="size-2.5" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {block.later?.length ? (
          <div className="mt-3.5">
            <CardLabel>Para una segunda etapa</CardLabel>
            <ul className="mt-2 space-y-1.5">
              {block.later.map((item) => (
                <li key={item} className="flex gap-2 text-[13.5px] leading-snug text-mist">
                  <FeatureIcon name="followup" className="mt-0.5 size-4 shrink-0 text-mist/80" />
                  {item}
                </li>
              ))}
            </ul>
            {block.meanwhile?.map((item) => (
              <p key={item} className="mt-2 text-[12.5px] leading-snug text-mist/85">
                {item}
              </p>
            ))}
          </div>
        ) : null}

        {block.situation?.length ? (
          <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
            <CardLabel>Tu situación actual</CardLabel>
            <dl className="mt-2 space-y-1 text-[13px]">
              {block.situation.map((row) => (
                <div key={row.label} className="grid grid-cols-[5.75rem_1fr] gap-2">
                  <dt className="text-mist">{row.label}</dt>
                  <dd className="text-snow/90">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}

        {block.notes?.map((note) => (
          <p key={note} className="mt-3 text-[12px] leading-snug text-mist/80">
            {note}
          </p>
        ))}

        {block.alternative && (
          <details className="group/alt mt-3 text-[13px]">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded text-mist transition-colors hover:text-snow [&::-webkit-details-marker]:hidden">
              ¿Y si tu necesidad cambia?
              <svg viewBox="0 0 16 16" fill="none" aria-hidden className="size-3.5 transition-transform group-open/alt:rotate-180">
                <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </summary>
            <p className="mt-1.5 leading-snug text-mist">{block.alternative}</p>
          </details>
        )}

        {block.actions?.length ? (
          <div className="mt-4 flex flex-col gap-2">
            {block.actions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => actions.onSend(action.message)}
                className={cn(
                  "inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-[13.5px] font-medium transition-colors",
                  action.primary ? "bg-jeipy text-white hover:bg-[#2a76ff]" : "border border-line-strong text-snow hover:border-glow/40 hover:bg-white/[0.03]",
                )}
              >
                {action.label}
                {action.primary && <ArrowIcon className="size-3.5" />}
              </button>
            ))}
          </div>
        ) : null}

        <p className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-mist/65">
          Orientativo: el alcance final se confirma con el equipo.
          <button type="button" onClick={() => actions.onNavigate("#planes")} className="rounded text-glow/90 underline-offset-2 hover:text-snow hover:underline">
            Ver planes
          </button>
        </p>
      </div>
    </section>
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
