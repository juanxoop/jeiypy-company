import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type BadgeProps = {
  children: ReactNode;
  tone?: "neutral" | "accent";
  className?: string;
};

export function Badge({ children, tone = "neutral", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
        tone === "neutral" && "border-line-strong bg-white/[0.03] text-mist",
        tone === "accent" && "border-glow/25 bg-jeipy/10 text-glow",
        className,
      )}
    >
      {children}
    </span>
  );
}
