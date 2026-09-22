import { ChannelIcon, CheckIcon } from "@/components/icons/BrandIcons";
import { PulseDot } from "@/components/ui/PulseDot";
import { cn } from "@/lib/cn";

/**
 * Escenario del hero: el sitio de "tu negocio" en escritorio y en móvil.
 * Es una ilustración, no un proyecto real; por eso usa textos genéricos.
 */

const tileGradients = [
  "bg-[linear-gradient(140deg,rgb(23_105_255/0.45),rgb(10_18_36/0.2))]",
  "bg-[linear-gradient(140deg,rgb(84_168_255/0.28),rgb(10_18_36/0.2))]",
  "bg-[linear-gradient(140deg,rgb(13_71_199/0.45),rgb(10_18_36/0.2))]",
  "bg-[linear-gradient(140deg,rgb(23_105_255/0.3),rgb(10_18_36/0.2))]",
];

function BrowserFrame() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line-strong bg-surface/95 shadow-[0_50px_140px_-50px_rgb(23_105_255/0.6),0_0_0_1px_rgb(0_0_0/0.5)] sm:rounded-[1.4rem]">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-white/10" />
          <span className="size-2.5 rounded-full bg-white/10" />
          <span className="size-2.5 rounded-full bg-white/10" />
        </div>
        <div className="mx-auto flex h-6 w-1/2 max-w-xs items-center justify-center gap-1.5 rounded-md bg-white/[0.04] font-mono text-[10px] text-mist">
          <svg viewBox="0 0 12 12" className="size-2.5" aria-hidden>
            <path d="M3.5 5.5V4a2.5 2.5 0 0 1 5 0v1.5M2.5 5.5h7v5h-7z" fill="none" stroke="currentColor" strokeWidth="1" />
          </svg>
          tunegocio.com
        </div>
        <span className="w-10" />
      </div>

      <div className="p-5 sm:p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="size-5 rounded-md bg-[linear-gradient(135deg,#1769ff,#0d47c7)]" />
            <span className="text-xs font-semibold tracking-tight text-snow">Tu negocio</span>
          </div>
          <div className="hidden gap-4 sm:flex">
            <span className="h-1.5 w-10 rounded-full bg-white/10" />
            <span className="h-1.5 w-10 rounded-full bg-white/10" />
            <span className="h-1.5 w-10 rounded-full bg-white/10" />
          </div>
        </div>

        <div className="mt-7 grid gap-7 sm:mt-10 sm:grid-cols-[1fr_1.05fr] sm:items-center sm:gap-10">
          <div className="space-y-4">
            <span className="block h-1.5 w-16 rounded-full bg-glow/50" />
            <p className="text-xl leading-tight font-semibold tracking-tight text-snow sm:text-[1.7rem]">
              Lo que ofreces, presentado como mereces.
            </p>
            <div className="space-y-2">
              <span className="block h-1.5 w-4/5 rounded-full bg-white/[0.08]" />
              <span className="block h-1.5 w-3/5 rounded-full bg-white/[0.08]" />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-jeipy px-3.5 text-[11px] font-medium text-white">
                <ChannelIcon name="whatsapp" className="size-3.5" />
                Escríbenos
              </span>
              <span className="inline-flex h-8 items-center rounded-full border border-line-strong px-3.5 text-[11px] text-mist">
                Ver catálogo
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {tileGradients.map((gradient, i) => (
              <div key={i} className={cn("overflow-hidden rounded-xl border border-line bg-white/[0.02]", i > 1 && "hidden sm:block")}>
                <div className={cn("aspect-[16/10]", gradient)} />
                <div className="space-y-1.5 p-2.5">
                  <span className="block h-1.5 w-4/5 rounded-full bg-white/10" />
                  <span className="block h-1.5 w-1/2 rounded-full bg-white/[0.06]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PhoneFrame() {
  return (
    <div className="w-40 overflow-hidden rounded-[1.6rem] border border-line-strong bg-ink p-1.5 shadow-[0_40px_80px_-30px_rgb(0_0_0/0.9),0_0_60px_-20px_rgb(23_105_255/0.5)]">
      <div className="overflow-hidden rounded-[1.25rem] bg-surface">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/15" />
        <div className="space-y-3 p-3.5">
          <div className="flex items-center gap-1.5">
            <span className="size-3.5 rounded bg-[linear-gradient(135deg,#1769ff,#0d47c7)]" />
            <span className="text-[9px] font-semibold text-snow">Tu negocio</span>
          </div>
          <p className="text-[13px] leading-tight font-semibold tracking-tight text-snow">Lo que ofreces, presentado como mereces.</p>
          <span className="block h-1 w-4/5 rounded-full bg-white/10" />
          <span className="flex h-6 items-center justify-center gap-1 rounded-full bg-jeipy text-[9px] font-medium text-white">
            <ChannelIcon name="whatsapp" className="size-2.5" />
            Escríbenos
          </span>
          <div className="aspect-[4/3] rounded-lg bg-[linear-gradient(140deg,rgb(23_105_255/0.45),rgb(10_18_36/0.2))]" />
        </div>
      </div>
    </div>
  );
}

export function HeroVisual({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("relative mx-auto w-full max-w-4xl", className)}>
      <div className="absolute inset-x-[8%] top-[5%] bottom-0 -z-10 rounded-full bg-jeipy/20 blur-[90px]" />

      <BrowserFrame />

      <div className="absolute -right-6 -bottom-10 hidden md:block lg:-right-12">
        <div className="animate-jp-float [animation-delay:1.6s]">
          <PhoneFrame />
        </div>
      </div>

      <div className="absolute -bottom-5 left-4 flex items-center gap-2.5 rounded-xl border border-line-strong bg-ink-blue/90 px-3.5 py-2.5 shadow-2xl backdrop-blur-md sm:-left-6 lg:-left-10">
        <PulseDot />
        <span className="text-xs font-medium text-snow">WhatsApp conectado</span>
      </div>
      <div className="absolute top-16 -right-4 hidden items-center gap-2 rounded-xl border border-line-strong bg-ink-blue/90 px-3.5 py-2.5 shadow-2xl backdrop-blur-md animate-jp-float sm:flex lg:-right-10">
        <span className="grid size-5 place-items-center rounded-full bg-jeipy/15 text-glow">
          <CheckIcon className="size-3" />
        </span>
        <span className="text-xs font-medium text-snow">Listo para móvil</span>
      </div>
    </div>
  );
}
