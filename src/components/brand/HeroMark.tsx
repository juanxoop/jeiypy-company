import { JpMark } from "./JpMark";

/**
 * Símbolo JP como punto focal del hero: se dibuja al cargar
 * y lo rodean dos anillos de "señal" con un pulso casi imperceptible.
 */
export function HeroMark() {
  return (
    <div className="relative grid size-28 place-items-center sm:size-32">
      <div aria-hidden className="absolute inset-0 rounded-full bg-[radial-gradient(closest-side,rgb(23_105_255/0.35),transparent)] blur-xl" />
      <span aria-hidden className="absolute inset-0 rounded-full border border-glow/15 animate-jp-ring" />
      <span aria-hidden className="absolute inset-0 rounded-full border border-glow/15 animate-jp-ring [animation-delay:2.2s]" />
      <JpMark
        tile
        draw
        title="Jeipy Company"
        className="relative size-16 text-snow drop-shadow-[0_10px_30px_rgb(23_105_255/0.45)] sm:size-[4.5rem]"
      />
    </div>
  );
}
