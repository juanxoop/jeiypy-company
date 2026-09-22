import { JpMark } from "@/components/brand/JpMark";
import { ChannelIcon, CheckIcon } from "@/components/icons/BrandIcons";
import { PulseDot } from "@/components/ui/PulseDot";
import { cn } from "@/lib/cn";

/**
 * Composición del hero: el sitio de "tu negocio" tomando forma.
 * Es una ilustración, no un proyecto real; por eso usa textos genéricos.
 */
export function HeroVisual({ className }: { className?: string }) {
  return (
    <div className={cn("relative mx-auto w-full max-w-[34rem]", className)}>
      <div aria-hidden className="absolute inset-[10%] -z-10 rounded-full bg-jeipy/15 blur-3xl" />

      {/* Ventana del navegador */}
      <div className="relative animate-jp-float [animation-delay:1.2s]">
        <div className="relative overflow-hidden rounded-2xl border border-line-strong bg-surface/90 shadow-[0_40px_120px_-40px_rgb(23_105_255/0.45),0_0_0_1px_rgb(0_0_0/0.4)] backdrop-blur-sm sm:rounded-[1.4rem]">
          <div className="flex items-center gap-3 border-b border-line px-4 py-3">
            <div className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-white/10" />
              <span className="size-2.5 rounded-full bg-white/10" />
              <span className="size-2.5 rounded-full bg-white/10" />
            </div>
            <div className="mx-auto flex h-6 w-1/2 items-center justify-center gap-1.5 rounded-md bg-white/[0.04] font-mono text-[10px] text-mist">
              <svg viewBox="0 0 12 12" className="size-2.5" aria-hidden>
                <path d="M3.5 5.5V4a2.5 2.5 0 0 1 5 0v1.5M2.5 5.5h7v5h-7z" fill="none" stroke="currentColor" strokeWidth="1" />
              </svg>
              tunegocio.com
            </div>
            <span className="w-10" />
          </div>

          <div className="space-y-5 p-5 sm:p-7">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="size-5 rounded-md bg-[linear-gradient(135deg,#1769ff,#0d47c7)]" />
                <span className="text-xs font-semibold tracking-tight text-snow">Tu negocio</span>
              </div>
              <div className="hidden gap-3 sm:flex">
                <span className="h-1.5 w-8 rounded-full bg-white/10" />
                <span className="h-1.5 w-8 rounded-full bg-white/10" />
                <span className="h-1.5 w-8 rounded-full bg-white/10" />
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              <p className="max-w-[16rem] text-lg leading-tight font-semibold tracking-tight text-snow sm:text-[1.4rem]">
                Lo que ofreces, presentado como mereces.
              </p>
              <span className="block h-1.5 w-3/5 rounded-full bg-white/[0.08]" />
              <span className="block h-1.5 w-2/5 rounded-full bg-white/[0.08]" />
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-jeipy px-3.5 text-[11px] font-medium text-white">
                <ChannelIcon name="whatsapp" className="size-3.5" />
                Escríbenos
              </span>
              <span className="inline-flex h-8 items-center rounded-full border border-line-strong px-3.5 text-[11px] text-mist">
                Ver catálogo
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 pt-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className="overflow-hidden rounded-xl border border-line bg-white/[0.02]">
                  <div
                    className={cn(
                      "aspect-[4/3]",
                      i === 0 && "bg-[linear-gradient(140deg,rgb(23_105_255/0.35),rgb(10_18_36/0.2))]",
                      i === 1 && "bg-[linear-gradient(140deg,rgb(84_168_255/0.2),rgb(10_18_36/0.2))]",
                      i === 2 && "bg-[linear-gradient(140deg,rgb(13_71_199/0.35),rgb(10_18_36/0.2))]",
                    )}
                  />
                  <div className="space-y-1.5 p-2">
                    <span className="block h-1.5 w-4/5 rounded-full bg-white/10" />
                    <span className="block h-1.5 w-1/2 rounded-full bg-white/[0.06]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Firma JP: el símbolo se dibuja al cargar */}
        <div
          aria-hidden
          className="absolute -top-6 -left-3 rounded-[1.1rem] shadow-[0_12px_40px_-8px_rgb(23_105_255/0.55)] sm:-top-7 sm:-left-7"
        >
          <JpMark tile draw className="size-14 text-snow sm:size-16" />
        </div>

        {/* Indicadores flotantes */}
        <div className="absolute -bottom-5 -left-3 flex items-center gap-2.5 rounded-xl border border-line-strong bg-ink-blue/90 px-3.5 py-2.5 shadow-2xl backdrop-blur-md sm:-left-8">
          <PulseDot />
          <span className="text-xs font-medium text-snow">WhatsApp conectado</span>
        </div>
        <div className="absolute top-16 -right-3 hidden items-center gap-2 rounded-xl border border-line-strong bg-ink-blue/90 px-3.5 py-2.5 shadow-2xl backdrop-blur-md sm:-right-8 sm:flex">
          <span className="grid size-5 place-items-center rounded-full bg-jeipy/15 text-glow">
            <CheckIcon className="size-3" />
          </span>
          <span className="text-xs font-medium text-snow">Listo para móvil</span>
        </div>
      </div>
    </div>
  );
}
