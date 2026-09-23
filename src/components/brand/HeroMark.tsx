import { JpMark } from "./JpMark";

/**
 * Isotipo JP como punto focal del hero: aparece con un destello metálico
 * y lo rodean dos anillos de "señal" con un pulso casi imperceptible.
 */
export function HeroMark() {
  return (
    <div className="relative grid size-32 place-items-center sm:size-40">
      <div aria-hidden className="absolute inset-0 rounded-full bg-[radial-gradient(closest-side,rgb(23_105_255/0.35),transparent)] blur-xl" />
      <span aria-hidden className="absolute inset-0 rounded-full border border-glow/15 animate-jp-ring" />
      <span aria-hidden className="absolute inset-0 rounded-full border border-glow/15 animate-jp-ring [animation-delay:2.2s]" />
      <JpMark
        reveal
        shine
        preload
        title="Jeipy Company"
        sizes="(min-width: 640px) 96px, 80px"
        className="relative size-20 drop-shadow-[0_14px_32px_rgb(23_105_255/0.35)] sm:size-24"
      />
    </div>
  );
}
