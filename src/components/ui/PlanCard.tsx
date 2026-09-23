import { CheckIcon } from "@/components/icons/BrandIcons";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { JeipyAiBlock } from "@/components/ui/JeipyAiBlock";
import { PulseDot } from "@/components/ui/PulseDot";
import type { Plan } from "@/data/plans";
import { cn } from "@/lib/cn";
import { getContactHref } from "@/lib/contact";

/** A partir de este número de características la lista se muestra en dos columnas. */
const TWO_COLUMN_THRESHOLD = 10;

export function PlanCard({ plan, index }: { plan: Plan; index: number }) {
  const featured = Boolean(plan.highlight);
  const twoColumns = plan.features.length >= TWO_COLUMN_THRESHOLD;
  const titleId = `plan-${plan.id}`;

  return (
    <Card featured={featured} className="flex h-full flex-col p-6 sm:p-8">
      <article aria-labelledby={titleId} className="flex h-full flex-col">
        <header>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span aria-hidden className="font-mono text-[11px] text-mist/60">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="h-px w-5 bg-line-strong" aria-hidden />
              <h3 id={titleId} className={cn("font-mono text-xs uppercase tracking-[0.22em]", featured ? "text-glow" : "text-snow/80")}>
                {plan.name}
              </h3>
            </div>
            {plan.highlight && (
              <span className="inline-flex items-center gap-2 rounded-full border border-glow/25 bg-jeipy/10 px-2.5 py-1 text-[11px] font-medium text-glow">
                <PulseDot />
                {plan.highlight}
              </span>
            )}
          </div>

          <p className="mt-8 text-sm text-mist">Desde</p>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
            <span className="text-[2.2rem] leading-none font-semibold tracking-[-0.04em] text-snow min-[400px]:text-[2.6rem] sm:text-5xl">
              {plan.price}
            </span>
            <span className="font-mono text-xs text-mist">{plan.currency}</span>
          </p>
          <p className="mt-5 leading-relaxed text-mist lg:min-h-[4.9lh]">{plan.summary}</p>
        </header>

        <div aria-hidden className="my-7 h-px bg-[linear-gradient(90deg,rgb(245_247_250/0.1),rgb(245_247_250/0.04))]" />

        <p className="text-sm font-medium text-snow">Incluye</p>
        <ul className={cn("mt-4 grid gap-3", twoColumns && "min-[420px]:grid-cols-2 min-[420px]:gap-x-4")}>
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-3 text-[15px] leading-snug text-mist">
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

        {plan.ai.mode === "none" ? (
          <p className="mt-6 flex items-center gap-2.5 text-xs text-mist/80">
            <span aria-hidden className="h-px w-4 bg-line-strong" />
            {plan.ai.label}
          </p>
        ) : (
          <JeipyAiBlock ai={plan.ai} className="mt-7" />
        )}

        <div className="mt-auto pt-9">
          <ButtonLink
            href={getContactHref(plan.cta.message)}
            variant={featured ? "primary" : "secondary"}
            withArrow
            className="w-full"
          >
            {plan.cta.label}
          </ButtonLink>
        </div>
      </article>
    </Card>
  );
}
