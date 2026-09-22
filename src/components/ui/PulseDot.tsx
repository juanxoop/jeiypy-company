import { cn } from "@/lib/cn";

/** Jeipy Pulse: indicador con pulso muy sutil. */
export function PulseDot({ className }: { className?: string }) {
  return <span aria-hidden className={cn("inline-block size-1.5 rounded-full bg-glow animate-jp-pulse", className)} />;
}
