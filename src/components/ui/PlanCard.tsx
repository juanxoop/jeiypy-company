import { CheckIcon } from "@/components/icons/BrandIcons";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PulseDot } from "@/components/ui/PulseDot";
import type { Plan } from "@/data/plans";
import { cn } from "@/lib/cn";
import { getContactHref } from "@/lib/contact";

export function PlanCard({ plan }: { plan: Plan }) {
  const featured = Boolean(plan.highlight);
  const titleId = `plan-${plan.id}`;

  return (
    <Card featured={featured} className={cn("flex h-full flex-col p-7 sm:p-8", featured && "lg:-my-4 lg:py-12")}>
      <article aria-labelledby={titleId} className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-3">
          <h3 id={titleId} className={cn("font-mono text-xs uppercase tracking-[0.22em]", featured ? "text-glow" : "text-mist")}>
            {plan.name}
          </h3>
          {plan.highlight && (
            <span className="inline-flex items-center gap-2 rounded-full border border-glow/25 bg-jeipy/10 px-2.5 py-1 text-[11px] font-medium text-glow">
              <PulseDot />
              {plan.highlight}
            </span>
          )}
        </div>

        <p className="mt-8 text-sm text-mist">Desde</p>
        <p className="mt-1 flex items-baseline gap-2">
          <span className="text-[2.2rem] leading-none font-semibold tracking-[-0.04em] text-snow min-[400px]:text-[2.6rem] sm:text-5xl">{plan.price}</span>
          <span className="font-mono text-xs text-mist">{plan.currency}</span>
        </p>
        <p className="mt-5 min-h-[3lh] leading-relaxed text-mist">{plan.summary}</p>

        <div aria-hidden className="my-7 h-px bg-line" />

        <p className="text-sm font-medium text-snow">Puede incluir</p>
        <ul className="mt-4 space-y-3">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-3 text-[15px] text-mist">
              <CheckIcon className={cn("mt-1 size-3.5 shrink-0", featured ? "text-glow" : "text-snow/60")} />
              {feature}
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-10">
          <ButtonLink
            href={getContactHref(`Hola Jeipy, me interesa el plan ${plan.name}.`)}
            variant={featured ? "primary" : "secondary"}
            withArrow
            className="w-full"
            aria-label={`Elegir plan ${plan.name}`}
          >
            Elegir {plan.name}
          </ButtonLink>
        </div>
      </article>
    </Card>
  );
}
