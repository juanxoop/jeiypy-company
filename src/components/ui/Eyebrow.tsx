import { cn } from "@/lib/cn";

type EyebrowProps = {
  children: React.ReactNode;
  index?: string;
  className?: string;
};

/** Etiqueta técnica de sección: [01] — Texto */
export function Eyebrow({ children, index, className }: EyebrowProps) {
  return (
    <p
      className={cn(
        "inline-flex items-center gap-3 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-mist",
        className,
      )}
    >
      {index && <span className="text-glow">[{index}]</span>}
      <span aria-hidden className="h-px w-6 bg-line-strong" />
      {children}
    </p>
  );
}
