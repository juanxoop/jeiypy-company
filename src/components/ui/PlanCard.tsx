import { CheckIcon } from "@/components/icons/BrandIcons";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { JeipyAiBlock } from "@/components/ui/JeipyAiBlock";
import { PulseDot } from "@/components/ui/PulseDot";
import type { Plan, PlanCtaIntent } from "@/data/plans";
import { cn } from "@/lib/cn";
import { getContactHref } from "@/lib/contact";

/** Cada intención de CTA tiene su propio peso visual. */
const ctaStyles: Record<PlanCtaIntent, { variant: "primary" | "secondary"; className?: string }> = {
  start: { variant: "secondary" },
  choose: { variant: "primary" },
  talk: { variant: "secondary", className: "border-glow/30 bg-jeipy/[0.06] hover:bg-jeipy/[0.12]" },
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-mist/80">{children}</p>;
}

export function PlanCard({ plan, index }: { plan: Plan; index: number }) {
  const featured = Boolean(plan.highlight);
  const titleId = `plan-${plan.id}`;
  const cta = ctaStyles[plan.cta.intent];

  return (
    <Card featured={featured} className="flex h-full flex-col p-6 sm:p-8">
      <article aria-labelledby={titleId} className="flex h-full flex-col">
        <header>
          <div className="flex min-h-7 items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span aria-hidden className="font-mono text-[11px] text-mist/60">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span aria-hidden className="h-px w-5 bg-line-strong" />
              <h3 id={titleId} className={cn("font-mono text-xs uppercase tracking-[0.22em]", featured ? "text-glow" : "text-snow/85")}>
                {plan.name}
              </h3>
            </div>
            {plan.highlight && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-glow/20 bg-jeipy/[0.08] px-2.5 py-1 text-[11px] font-medium text-glow">
                <PulseDot className="size-1" />
                {plan.highlight}
              </span>
            )}
          </div>

          <p className="mt-7 text-sm text-mist">Desde</p>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
            <span className="text-[2.2rem] leading-none font-semibold tracking-[-0.04em] text-snow min-[400px]:text-[2.6rem] sm:text-5xl">
              {plan.price}
            </span>
            <span className="font-mono text-xs text-mist">{plan.currency}</span>
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-mist lg:min-h-[3lh]">{plan.summary}</p>
        </header>

        <div aria-hidden className="my-6 h-px bg-[linear-gradient(90deg,rgb(245_247_250/0.1),rgb(245_247_250/0.03))]" />

        <SectionLabel>Incluye</SectionLabel>
        <ul className="mt-4 grid gap-2.5">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5 text-[15px] leading-snug text-snow/80">
              <span
                className={cn(
                  "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full",
                  featured ? "bg-jeipy/15 text-glow" : "bg-white/[0.06] text-snow/70",
                )}
              >
                <CheckIcon className="size-2.5" />
              </span>
              {feature}
            </li>
          ))}
        </ul>

        <div className="mt-7">
          {plan.ai.mode === "addon" && <SectionLabel>Complemento opcional</SectionLabel>}
          <JeipyAiBlock ai={plan.ai} className={cn(plan.ai.mode === "addon" && "mt-3")} />
        </div>

        <div className="mt-auto pt-8">
          <ButtonLink href={getContactHref(plan.cta.message)} variant={cta.variant} withArrow className={cn("w-full", cta.className)}>
            {plan.cta.label}
          </ButtonLink>
        </div>
      </article>
    </Card>
  );
}
