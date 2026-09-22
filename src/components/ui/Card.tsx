"use client";

import { useCallback, useRef, type ComponentPropsWithoutRef, type PointerEvent } from "react";
import { cn } from "@/lib/cn";

type CardProps = ComponentPropsWithoutRef<"div"> & {
  /** Activa Card Lift + Glow + foco que sigue al cursor. */
  interactive?: boolean;
  /** Borde con gradiente azul para elementos destacados. */
  featured?: boolean;
  /** "tinted": superficie con un velo azul sutil, para bloques de beneficio o servicio. */
  tone?: "default" | "tinted";
};

/**
 * Card base de Jeipy.
 * El seguimiento del cursor escribe variables CSS directamente en el nodo:
 * no provoca renders de React.
 */
export function Card({ interactive = true, featured = false, tone = "default", className, onPointerMove, children, ...props }: CardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      onPointerMove?.(event);
      const node = ref.current;
      if (!node || event.pointerType !== "mouse") return;
      const rect = node.getBoundingClientRect();
      node.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      node.style.setProperty("--my", `${event.clientY - rect.top}px`);
    },
    [onPointerMove],
  );

  return (
    <div
      ref={ref}
      onPointerMove={interactive ? handlePointerMove : onPointerMove}
      className={cn(
        "relative isolate rounded-3xl border border-line bg-surface",
        "shadow-[inset_0_1px_0_rgb(245_247_250/0.04)]",
        interactive && "group jp-lift jp-spotlight hover:border-glow/25 hover:shadow-[inset_0_1px_0_rgb(245_247_250/0.05),0_18px_50px_-24px_rgb(23_105_255/0.45)]",
        tone === "tinted" &&
          "border-glow/[0.13] bg-[linear-gradient(160deg,rgb(23_105_255/0.16)_0%,rgb(13_71_199/0.07)_42%,rgb(10_14_22/0.92)_100%)] shadow-[inset_0_1px_0_rgb(84_168_255/0.12)]",
        tone === "tinted" && interactive && "hover:border-glow/35",
        featured && "jp-gradient-border border-transparent bg-[linear-gradient(180deg,#0d1526,#0a0e16_60%)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
