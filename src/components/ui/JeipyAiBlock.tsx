import Link from "next/link";
import { AssistantOrb } from "@/features/assistant/components/AssistantOrb";
import { jeipyAi, type PlanAi } from "@/data/plans";
import { cn } from "@/lib/cn";

/** Enlace discreto hacia la oferta completa de Jeipy AI, dentro de la sección Planes. */
function OfferLink({ label }: { label: string }) {
  return (
    <Link
      href="#jeipy-ai"
      className="group mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-glow transition-colors hover:text-snow"
    >
      {label}
      <svg viewBox="0 0 16 16" fill="none" aria-hidden className="jp-arrow size-3.5">
        <path d="M3 8h9.5M8.5 3.5 13 8l-4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}

/**
 * Relación de cada plan con Jeipy AI, con tres niveles de protagonismo:
 * "none" (sin IA), "addon" (Lite como complemento opcional) y "featured" (compatible con Pro).
 * En ningún caso la IA forma parte del precio del plan: se contrata aparte.
 */
export function JeipyAiBlock({ ai, className }: { ai: PlanAi; className?: string }) {
  if (ai.mode === "none") {
    return (
      <p className={cn("flex items-center gap-2.5 rounded-xl border border-line px-4 py-3 text-[13px] text-mist", className)}>
        <AssistantOrb still className="size-4 shrink-0 opacity-50 grayscale" />
        {ai.note}
      </p>
    );
  }

  if (ai.mode === "addon") {
    return (
      <section aria-label={`${ai.tier}, complemento opcional`} className={cn("rounded-xl border border-dashed border-line-strong p-4", className)}>
        <p className="inline-flex items-center gap-2 rounded-full border border-glow/20 bg-jeipy/[0.08] py-1 pr-3 pl-1.5 text-xs font-medium text-snow">
          <span aria-hidden className="grid size-4.5 place-items-center rounded-full bg-jeipy/20 font-mono text-[11px] leading-none text-glow">
            +
          </span>
          {ai.tag}
        </p>
        <p className="mt-3 text-[13px] leading-relaxed text-mist">{ai.description}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-mist/70">{ai.note}</p>
        <OfferLink label={`Conocer ${ai.tier}`} />
      </section>
    );
  }

  return (
    <section
      aria-label={`${ai.tier}, compatible con este plan`}
      className={cn(
        "jp-gradient-border relative overflow-hidden rounded-2xl bg-[linear-gradient(165deg,#0e1a33_0%,#0a1224_45%,#070a11_100%)] p-5 sm:p-6",
        className,
      )}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 jp-grid opacity-50 [mask-image:radial-gradient(ellipse_90%_70%_at_100%_0%,#000,transparent_70%)]" />
      <div aria-hidden className="absolute -top-16 -right-16 size-44 rounded-full bg-jeipy/25 blur-3xl" />
      <div aria-hidden className="absolute inset-x-0 top-0 h-px overflow-hidden">
        <div className="h-full w-1/3 bg-[linear-gradient(90deg,transparent,rgb(84_168_255/0.9),transparent)] animate-jp-scan" />
      </div>

      <div className="relative">
        <p className="inline-block rounded-full border border-glow/25 bg-jeipy/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-glow">
          {ai.tag}
        </p>
        <div className="mt-4 flex items-center gap-3">
          <AssistantOrb className="size-10 drop-shadow-[0_6px_16px_rgb(23_105_255/0.45)]" />
          <div>
            <p className="font-semibold tracking-[-0.01em] text-snow">{ai.tier}</p>
            <p className="text-xs text-glow">{jeipyAi.tagline}</p>
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-snow/85">{ai.headline}</p>

        <dl className="mt-5 space-y-2.5 border-t border-white/[0.07] pt-4">
          {ai.groups.map((group) => (
            <div key={group.label} className="grid gap-1 min-[420px]:grid-cols-[4rem_1fr] min-[420px]:items-baseline min-[420px]:gap-3">
              <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-glow/90">{group.label}</dt>
              <dd className="text-[13px] leading-snug text-mist">{group.items.join(" · ")}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-4 text-xs leading-relaxed text-mist/75">{ai.note}</p>
        <OfferLink label={`Conocer ${ai.tier}`} />
      </div>
    </section>
  );
}
