import { CheckIcon } from "@/components/icons/BrandIcons";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { jeipyAiOffer, jeipyAiTiers, type JeipyAiTier } from "@/data/jeipyAi";
import { AssistantCta } from "@/features/assistant/components/AssistantCta";
import { AssistantOrb } from "@/features/assistant/components/AssistantOrb";
import { cn } from "@/lib/cn";

/** Dos capas: el plan web construye la presencia; Jeipy AI la potencia. */
function Layers() {
  const [web, ai] = jeipyAiOffer.layers;
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
      <p className="flex flex-1 items-center gap-3 rounded-2xl border border-line bg-surface/60 px-4 py-3 text-left">
        <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-lg border border-line-strong">
          <svg viewBox="0 0 16 16" fill="none" className="size-4 text-snow/80">
            <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M2 6h12" stroke="currentColor" strokeWidth="1.3" />
          </svg>
        </span>
        <span>
          <span className="block text-sm font-medium text-snow">{web.label}</span>
          <span className="block text-xs text-mist">{web.text}</span>
        </span>
      </p>
      <span aria-hidden className="self-center font-mono text-sm text-glow">+</span>
      <p className="flex flex-1 items-center gap-3 rounded-2xl border border-glow/20 bg-jeipy/[0.06] px-4 py-3 text-left">
        <AssistantOrb still className="size-8 shrink-0" />
        <span>
          <span className="block text-sm font-medium text-snow">{ai.label}</span>
          <span className="block text-xs text-mist">{ai.text}</span>
        </span>
      </p>
    </div>
  );
}

function PriceRow({ label, value, hint, strong }: { label: string; value: string; hint?: string; strong?: boolean }) {
  return (
    <div className="py-3">
      <dt className="flex items-center justify-between gap-3 text-xs text-mist">
        {label}
        {hint && <span className="font-mono text-[10px] uppercase tracking-wider text-mist/80">{hint}</span>}
      </dt>
      <dd className={cn("mt-1", strong ? "text-xl font-semibold tracking-[-0.02em] text-snow" : "text-[13px] text-snow/85")}>{value}</dd>
    </div>
  );
}

function TierCard({ tier }: { tier: JeipyAiTier }) {
  const titleId = `jeipy-ai-${tier.id}`;
  return (
    <Card featured={tier.featured} className="flex h-full flex-col p-6 sm:p-7">
      <article aria-labelledby={titleId} className="flex h-full flex-col">
        <header>
          <div className="flex items-center gap-3">
            <AssistantOrb still={!tier.featured} className={cn("size-9 shrink-0", !tier.featured && "opacity-85")} />
            <div>
              <h4 id={titleId} className="font-semibold tracking-[-0.01em] text-snow">
                {tier.name}
              </h4>
              <p className={cn("font-mono text-[10px] uppercase tracking-[0.16em]", tier.featured ? "text-glow" : "text-mist")}>
                {tier.pairsWith}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-mist lg:min-h-[4lh] xl:min-h-[3lh]">{tier.audience}</p>
        </header>

        <dl className="mt-5 divide-y divide-white/[0.06] rounded-xl border border-line bg-ink/40 px-4">
          <PriceRow
            label={tier.setup.label}
            value={`Desde ${tier.setup.price} ${tier.setup.currency}`}
            hint={tier.id === "custom" ? undefined : "Pago único"}
            strong
          />
          <PriceRow label="Operación mensual" value={tier.operation} hint="Cada mes" />
          <PriceRow label={tier.maintenance.label} value={tier.maintenance.value} />
        </dl>
        {tier.setup.note && <p className="mt-2.5 text-xs leading-relaxed text-mist/75">{tier.setup.note}</p>}

        <ul className="mt-6 grid gap-2.5">
          {tier.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5 text-sm leading-snug text-snow/80">
              <span
                className={cn(
                  "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full",
                  tier.featured ? "bg-jeipy/15 text-glow" : "bg-white/[0.06] text-snow/70",
                )}
              >
                <CheckIcon className="size-2.5" />
              </span>
              {feature}
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-7">
          <AssistantCta
            message={tier.cta.message}
            variant={tier.featured ? "primary" : "secondary"}
            withArrow
            className="h-auto min-h-11 w-full py-2.5 text-center whitespace-normal"
          >
            {tier.cta.label}
          </AssistantCta>
        </div>
      </article>
    </Card>
  );
}

/**
 * Oferta de Jeipy AI dentro de Planes: complemento del plan web, nunca un reemplazo.
 * Separa la configuración inicial (pago único) de la operación mensual (según uso).
 */
export function JeipyAiOffer() {
  const { setup, operation } = jeipyAiOffer.pricing;
  return (
    <div id="jeipy-ai" aria-labelledby="jeipy-ai-title" role="region" className="mt-24 sm:mt-32">
      <div className="mx-auto max-w-3xl text-center">
        <Reveal>
          <Eyebrow className="justify-center">{jeipyAiOffer.eyebrow}</Eyebrow>
        </Reveal>
        <Reveal delay={0.06}>
          <h3 id="jeipy-ai-title" className="mt-5 text-[1.75rem] leading-[1.1] font-semibold tracking-[-0.03em] text-snow sm:text-4xl lg:text-[2.75rem]">
            <span className="jp-text-gradient">Potencia tu página</span> con Jeipy AI
          </h3>
        </Reveal>
        <Reveal delay={0.12}>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-mist sm:text-lg">{jeipyAiOffer.intro}</p>
        </Reveal>
      </div>

      <Reveal delay={0.16} className="mt-10">
        <Layers />
      </Reveal>

      <Reveal className="mt-12">
        <ul className="mx-auto grid max-w-5xl gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {jeipyAiOffer.benefits.map((benefit) => (
            <li key={benefit} className="flex items-start gap-2.5 text-sm leading-snug text-snow/80">
              <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-glow shadow-[0_0_8px_rgb(84_168_255/0.8)]" />
              {benefit}
            </li>
          ))}
        </ul>
      </Reveal>

      <RevealGroup as="ul" className="mx-auto mt-14 grid max-w-xl grid-cols-1 gap-5 lg:max-w-none lg:grid-cols-[1fr_1.1fr_1fr] lg:gap-4 xl:gap-5">
        {jeipyAiTiers.map((tier) => (
          <RevealItem as="li" key={tier.id} className="h-full">
            <TierCard tier={tier} />
          </RevealItem>
        ))}
      </RevealGroup>

      <Reveal className="mt-10">
        <dl className="mx-auto grid max-w-4xl gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
          {[
            { ...setup, badge: "Una vez" },
            { ...operation, badge: "Cada mes" },
          ].map((concept) => (
            <div key={concept.title} className="bg-surface p-5 sm:p-6">
              <dt className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-snow">{concept.title}</span>
                <span className="rounded-full border border-line-strong px-2 py-px font-mono text-[10px] uppercase tracking-wider text-mist">
                  {concept.badge}
                </span>
              </dt>
              <dd className="mt-2 text-[13px] leading-relaxed text-mist">{concept.text}</dd>
            </div>
          ))}
        </dl>
      </Reveal>
    </div>
  );
}
