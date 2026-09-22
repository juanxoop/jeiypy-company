import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

type SectionProps = ComponentPropsWithoutRef<"section"> & { id: string };

/** Sección de la home con espaciado vertical consistente. */
export function Section({ className, ...props }: SectionProps) {
  return <section className={cn("relative py-24 sm:py-28 lg:py-36", className)} {...props} />;
}
