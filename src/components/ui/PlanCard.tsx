import { CheckIcon } from "@/components/icons/BrandIcons";
import { FeatureIcon } from "@/components/icons/FeatureIcon";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { JeipyAiBlock } from "@/components/ui/JeipyAiBlock";
import { PulseDot } from "@/components/ui/PulseDot";
import type { Plan, PlanCtaIntent } from "@/data/plans";
import { cn } from "@/lib/cn";
import { getContactHref } from "@/lib/contact";

/** Puntos de "Incluye" visibles de entrada; el resto se despliega. */
export const FEATURES_VISIBLE = 6;

/** Cada intención de CTA tiene su propio peso visual. */
const ctaStyles: Record<PlanCtaIntent, { variant: "primary" | "secondary"; className?: string }> = {
  start: { variant: "secondary" },
  choose: { variant: "primary" },
  talk: { variant: "secondary", className: "border-glow/30 bg-jeipy/[0.06] hover:bg-jeipy/[0.12]" },
};

/**
 * Identidad visual de cada plan, para que no parezcan tres versiones de la misma web:
 * Básico = presencia (neutro), Esencial = captación (azul), Premium = automatización (azul profundo + trama).
 */
const tone = {
  basico: {
    tile: "border border-line-strong bg-white/[0.04] text-snow/85",
    check: "bg-white/[0.06] text-snow/70",
    step: "border-line-strong bg-white/[0.03] text-snow/80",
    outcome: "bg-white/[0.05] text-snow/80",
  },
  esencial: {
    tile: "border border-glow/30 bg-jeipy/15 text-glow",
    check: "bg-jeipy/15 text-glow",
    step: "border-glow/25 bg-jeipy/[0.08] text-snow/90",
    outcome: "bg-jeipy/15 text-glow",
  },
  premium: {
    tile: "border border-glow/35 bg-[linear-gradient(145deg,rgb(23_105_255/0.35),rgb(13_71_199/0.12))] text-snow shadow-[0_8px_24px_-12px_rgb(23_105_255/0.8)]",
    check: "bg-jeipy/15 text-glow",
    step: "border-glow/30 bg-[linear-gradient(180deg,rgb(23_105_255/0.14),rgb(23_105_255/0.05))] text-snow/90",
    outcome: "bg-jeipy/20 text-glow",
  },
} satisfies Record<Plan["id"], Record<string, string>>;

function Label({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-mist/80">{children}</p>;
}

/** Cómo trabaja el plan: elementos que conviven (Básico), un recorrido (Esencial) o un ciclo (Premium). */
function Signature({ plan }: { plan: Plan }) {
  const { kind, steps } = plan.signature;
  const t = tone[plan.id];
  return (
    <ol aria-label={kind === "set" ? "Qué reúne" : "Cómo funciona"} className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
      {steps.map((step, i) => (
        <li key={step} className="flex items-center gap-1.5">
          <span className={cn("rounded-full border px-2.5 py-1 text-[12px] leading-none font-medium", t.step)}>{step}</span>
          {/* El conector va detrás del paso: si la fila se parte, nunca queda al inicio de una línea. */}
          {i < steps.length - 1 && (
            <span aria-hidden className="text-[11px] text-mist/60">
              {kind === "set" ? "+" : "→"}
            </span>
          )}
        </li>
      ))}
      {kind === "loop" && (
        <li aria-hidden className="flex items-center pl-0.5 text-glow">
          <FeatureIcon name="automation" className="size-3.5" />
        </li>
      )}
    </ol>
  );
}

function FeatureItem({ feature, check }: { feature: string; check: string }) {
  return (
    <li className="flex items-start gap-2.5 text-[14.5px] leading-snug text-snow/85">
      <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-full", check)}>
        <CheckIcon className="size-2.5" />
      </span>
      {feature}
    </li>
  );
}

/**
 * Tarjeta de plan. En escritorio, sus 9 filas se alinean con las de las otras tarjetas (subgrid),
 * así precio, "Ideal para", "Incluye" y el CTA quedan a la misma altura en los tres planes.
 */
export function PlanCard({ plan }: { plan: Plan }) {
  const featured = Boolean(plan.highlight);
  const titleId = `plan-${plan.id}`;
  const cta = ctaStyles[plan.cta.intent];
  const t = tone[plan.id];
  const visible = plan.features.slice(0, FEATURES_VISIBLE);
  const more = plan.features.slice(FEATURES_VISIBLE);
  const subgrid = "lg:row-span-9 lg:grid lg:grid-rows-subgrid";

  return (
    <Card featured={featured} className={cn("flex h-full flex-col overflow-hidden p-6 sm:p-7", subgrid)}>
      {plan.id === "premium" && (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40 jp-grid opacity-40 [mask-image:linear-gradient(180deg,#000,transparent)]" />
      )}
      <article aria-labelledby={titleId} className={cn("relative flex h-full flex-col", subgrid)}>
        {/* 1 · Identidad */}
        <header className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span aria-hidden className={cn("grid size-10 shrink-0 place-items-center rounded-xl", t.tile)}>
              <FeatureIcon name={plan.focus.icon} className="size-5" />
            </span>
            <div>
              <h3 id={titleId} className={cn("text-lg font-semibold tracking-[-0.02em]", featured ? "text-glow" : "text-snow")}>
                {plan.name}
              </h3>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-mist">{plan.focus.label}</p>
            </div>
          </div>
          {plan.highlight && (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-glow/20 bg-jeipy/[0.08] px-2.5 py-1 text-[11px] font-medium text-glow">
              <PulseDot className="size-1" />
              {plan.highlight}
            </span>
          )}
        </header>

        {/* 2 · Precio */}
        <div className="pt-6">
          <p className="text-sm text-mist">Desde</p>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
            <span className="text-[2.2rem] leading-none font-semibold tracking-[-0.04em] text-snow min-[400px]:text-[2.5rem] xl:text-5xl">
              {plan.price}
            </span>
            <span className="font-mono text-xs text-mist">{plan.currency}</span>
          </p>
        </div>

        {/* 3 · Promesa */}
        <div className="pt-4">
          <p className={cn("text-[16px] leading-snug font-medium tracking-[-0.01em]", featured ? "text-snow" : "text-snow/95")}>{plan.positioning}</p>
          {plan.positioningNote && <p className="mt-1.5 text-[13.5px] leading-relaxed text-mist">{plan.positioningNote}</p>}
        </div>

        {/* 4 · Cómo trabaja */}
        <div className="pt-4">
          <Signature plan={plan} />
        </div>

        {/* 5 · Ideal para */}
        <div className="pt-6">
          <div className="rounded-2xl border border-line bg-white/[0.02] p-3.5">
            <Label>Ideal para</Label>
            <ul className="mt-2.5 flex flex-wrap gap-1.5">
              {plan.idealFor.map((item) => (
                <li key={item} className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[12.5px] leading-snug text-snow/85">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 6 · Incluye */}
        <div className="pt-6">
          <Label>Incluye</Label>
          <ul className="mt-3.5 grid gap-2.5">
            {visible.map((feature) => (
              <FeatureItem key={feature} feature={feature} check={t.check} />
            ))}
          </ul>
          {more.length > 0 && (
            <details className="group/more mt-2.5">
              <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-md text-[13px] font-medium text-glow transition-colors hover:text-snow [&::-webkit-details-marker]:hidden">
                <span className="group-open/more:hidden">Ver todo lo que incluye (+{more.length})</span>
                <span className="hidden group-open/more:inline">Ver menos</span>
                <svg viewBox="0 0 16 16" fill="none" aria-hidden className="size-3.5 transition-transform group-open/more:rotate-180">
                  <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </summary>
              <ul className="mt-2.5 grid gap-2.5">
                {more.map((feature) => (
                  <FeatureItem key={feature} feature={feature} check={t.check} />
                ))}
              </ul>
            </details>
          )}
        </div>

        {/* 7 · Resultado esperado */}
        <div className="pt-6">
          <Label>Resultado esperado</Label>
          <ul className="mt-3 grid gap-2">
            {plan.outcomes.map((o) => (
              <li key={o.label} className="flex items-center gap-2.5 text-[14px] font-medium text-snow">
                <span aria-hidden className={cn("grid size-7 shrink-0 place-items-center rounded-lg", t.outcome)}>
                  <FeatureIcon name={o.icon} className="size-3.5" />
                </span>
                {o.label}
              </li>
            ))}
          </ul>
        </div>

        {/* 8 · Jeipy AI */}
        <div className="pt-6">
          <JeipyAiBlock ai={plan.ai} />
        </div>

        {/* 9 · CTA */}
        <div className="mt-auto pt-6 lg:mt-0 lg:self-end">
          <ButtonLink
            href={getContactHref(plan.cta.message)}
            variant={cta.variant}
            withArrow
            aria-label={`${plan.cta.label}: plan ${plan.name}`}
            className={cn("w-full", cta.className)}
          >
            {plan.cta.label}
          </ButtonLink>
        </div>
      </article>
    </Card>
  );
}
