import { cn } from "@/lib/cn";

/** Flecha con el patrón Jeipy Arrow: se mueve cuando su contenedor .group recibe hover. */
export function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className={cn("jp-arrow size-4 shrink-0", className)}
    >
      <path d="M3 8h9.5M8.5 3.5 13 8l-4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
