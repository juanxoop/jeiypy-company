import { cn } from "@/lib/cn";

/* Partículas con posiciones fijas: mismo resultado en servidor y cliente, sin JS. */
const particles = [
  { x: 8, y: 22, d: 0 }, { x: 18, y: 68, d: 1.8 }, { x: 27, y: 38, d: 3.1 }, { x: 36, y: 82, d: 0.9 },
  { x: 47, y: 14, d: 2.4 }, { x: 58, y: 58, d: 4.2 }, { x: 66, y: 28, d: 1.2 }, { x: 74, y: 76, d: 3.6 },
  { x: 83, y: 44, d: 0.4 }, { x: 91, y: 18, d: 2.8 }, { x: 94, y: 64, d: 5 }, { x: 52, y: 90, d: 1.5 },
];

type AmbientBackgroundProps = {
  className?: string;
  /** Muestra partículas discretas. */
  particles?: boolean;
  /** Intensidad de la luz ambiental. */
  intensity?: "low" | "medium";
};

export function AmbientBackground({ className, particles: withParticles = false, intensity = "low" }: AmbientBackgroundProps) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div className="absolute inset-0 jp-grid jp-noise-fade opacity-70" />
      <div
        className={cn(
          "absolute top-[-20%] left-1/2 h-[70%] w-[90%] -translate-x-1/2 rounded-full blur-3xl animate-jp-drift will-change-transform",
          "bg-[radial-gradient(closest-side,rgb(13_71_199/0.55),rgb(10_18_36/0.35)_60%,transparent)]",
          intensity === "low" ? "opacity-50" : "opacity-80",
        )}
      />
      <div className="absolute right-[-10%] bottom-[-25%] h-[50%] w-[50%] rounded-full bg-[radial-gradient(closest-side,rgb(23_105_255/0.16),transparent)] blur-3xl" />
      {withParticles &&
        particles.map((p, i) => (
          <span
            key={i}
            className="absolute hidden size-[3px] rounded-full bg-glow animate-jp-twinkle sm:block"
            style={{ left: `${p.x}%`, top: `${p.y}%`, animationDelay: `${p.d}s` }}
          />
        ))}
    </div>
  );
}
