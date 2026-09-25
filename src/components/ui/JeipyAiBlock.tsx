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
 * Relación de cada plan con Jeipy AI, en versión compacta para la tarjeta del plan
 * (el detalle completo de Lite, Pro y Custom está en la oferta de Jeipy AI, justo debajo):
 * "none" (sin IA), "addon" (Lite como complemento opcional) y "featured" (compatible con Pro).
 * En ningún caso la IA forma parte del precio del plan: se contrata aparte.
 */
export function JeipyAiBlock({ ai, className }: { ai: PlanAi; className?: string }) {
  if (ai.mode === "none") {
    return (
      <p className={cn("flex items-center gap-2.5 rounded-xl border border-line px-3.5 py-3 text-[13px] leading-snug text-mist", className)}>
        <AssistantOrb still className="size-4 shrink-0 opacity-50 grayscale" />
        <span>
          <span className="text-snow/80">Sin Jeipy AI.</span> {ai.note}
        </span>
      </p>
    );
  }

  if (ai.mode === "addon") {
    return (
      <section aria-label={`${ai.tier}, complemento opcional`} className={cn("rounded-xl border border-dashed border-line-strong p-3.5", className)}>
        <p className="flex flex-wrap items-center gap-2 text-[13px] font-medium text-snow">
          <span aria-hidden className="grid size-4.5 place-items-center rounded-full bg-jeipy/20 font-mono text-[11px] leading-none text-glow">
            +
          </span>
          {ai.tier}
          <span className="rounded-full border border-line-strong px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-mist">Opcional</span>
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-mist">{ai.description}</p>
        <p className="mt-1 text-xs leading-relaxed text-mist/75">{ai.note}</p>
        <OfferLink label={`Conocer ${ai.tier}`} />
      </section>
    );
  }

  return (
    <section
      aria-label={`${ai.tier}, compatible con este plan`}
      className={cn(
        "jp-gradient-border relative overflow-hidden rounded-2xl bg-[linear-gradient(165deg,#0e1a33_0%,#0a1224_50%,#070a11_100%)] p-4",
        className,
      )}
    >
      <div aria-hidden className="absolute -top-12 -right-12 size-32 rounded-full bg-jeipy/20 blur-3xl" />
      <div className="relative">
        <div className="flex items-center gap-2.5">
          <AssistantOrb className="size-8 shrink-0" />
          <div>
            <p className="text-[13.5px] font-semibold text-snow">{ai.tag}</p>
            <p className="text-xs text-glow">{jeipyAi.tagline}</p>
          </div>
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-1.5">
          {ai.groups.map((group) => (
            <div key={group.label} className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-2 py-2">
              <dt className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-glow">{group.label}</dt>
              <dd className="mt-1 text-[11.5px] leading-snug text-mist">{group.items[0]}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2.5 text-xs leading-relaxed text-mist/75">{ai.note}</p>
        <OfferLink label={`Conocer ${ai.tier}`} />
      </div>
    </section>
  );
}
