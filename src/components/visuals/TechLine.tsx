import { cn } from "@/lib/cn";

/** Línea técnica de 1px con un destello que la recorre lentamente. */
export function TechLine({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("relative h-px w-full overflow-hidden", className)}>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgb(245_247_250/0.1)_20%,rgb(245_247_250/0.1)_80%,transparent)]" />
      <div className="absolute inset-y-0 left-0 w-1/4 bg-[linear-gradient(90deg,transparent,rgb(84_168_255/0.9),transparent)] animate-jp-scan" />
    </div>
  );
}
