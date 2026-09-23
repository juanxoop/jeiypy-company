import { SparkIcon } from "@/components/icons/BrandIcons";
import type { PlanAi } from "@/data/plans";
import { cn } from "@/lib/cn";

type JeipyAiBlockProps = {
  ai: Extract<PlanAi, { mode: "addon" | "featured" }>;
  className?: string;
};

/**
 * Presentación de Jeipy AI dentro de un plan.
 * "addon": mejora opcional compacta. "featured": bloque destacado con capacidades.
 */
export function JeipyAiBlock({ ai, className }: JeipyAiBlockProps) {
  const featured = ai.mode === "featured";

  return (
    <section
      aria-label={ai.title}
      className={cn(
        "relative overflow-hidden rounded-2xl border",
        featured
          ? "border-glow/20 bg-[linear-gradient(160deg,rgb(23_105_255/0.16),rgb(13_71_199/0.05)_50%,rgb(10_14_22/0.6))] p-5 sm:p-6"
          : "border-dashed border-line-strong bg-white/[0.02] p-4 sm:p-5",
        className,
      )}
    >
      {featured && (
        <>
          <div aria-hidden className="pointer-events-none absolute inset-0 jp-grid opacity-40 [mask-image:linear-gradient(to_bottom,#000,transparent_70%)]" />
          <div aria-hidden className="absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,rgb(84_168_255/0.8),transparent)]" />
        </>
      )}

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-lg text-glow ring-1",
                featured ? "bg-jeipy/20 ring-glow/30" : "bg-jeipy/10 ring-glow/20",
              )}
            >
              <SparkIcon />
            </span>
            <div>
              <p className="font-semibold tracking-[-0.01em] text-snow">{ai.title}</p>
              {featured && <p className="text-xs text-glow">{ai.tag}</p>}
            </div>
          </div>
          {!featured && (
            <span className="rounded-full border border-line-strong px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-mist">
              {ai.tag}
            </span>
          )}
        </div>

        <p className="mt-3 text-sm leading-relaxed text-mist">{ai.description}</p>

        {ai.mode === "featured" && (
          <>
            <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.18em] text-mist/80">{ai.capabilitiesLabel}</p>
            <ul className="mt-3 grid gap-x-4 gap-y-2 min-[420px]:grid-cols-2">
              {ai.capabilities.map((capability) => (
                <li key={capability} className="flex items-start gap-2 text-xs leading-snug text-snow/85">
                  <span aria-hidden className="mt-[0.45em] size-1 shrink-0 rounded-full bg-glow/80" />
                  {capability}
                </li>
              ))}
            </ul>
          </>
        )}

        <p className="mt-4 text-xs leading-relaxed text-mist/80">{ai.note}</p>
      </div>
    </section>
  );
}
