import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { isExternalHref } from "@/lib/contact";
import { ArrowIcon } from "@/components/icons/ArrowIcon";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "md" | "lg";

type ButtonLinkProps = {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  withArrow?: boolean;
  /** Halo azul y destello al hover: reservado para el CTA principal de una pantalla. */
  glow?: boolean;
  className?: string;
  onClick?: () => void;
  "aria-label"?: string;
};

const base =
  "group relative inline-flex items-center justify-center gap-2.5 rounded-full font-medium whitespace-nowrap select-none " +
  "transition-[background-color,color,border-color,box-shadow,transform] duration-300 ease-(--ease-jeipy) " +
  "active:scale-[0.98] focus-visible:outline-offset-4";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-jeipy text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_1px_2px_rgb(0_0_0/0.4)] " +
    "hover:bg-[#2a76ff] hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_10px_36px_-8px_rgb(23_105_255/0.65)]",
  secondary:
    "border border-line-strong bg-white/[0.02] text-snow hover:border-glow/40 hover:bg-white/[0.04] jp-glow",
  ghost: "text-snow/80 hover:text-snow",
};

const glowStyles =
  "overflow-hidden bg-[linear-gradient(180deg,#2a78ff,#1769ff_55%,#0f55e0)] " +
  "shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_0_0_1px_rgb(84_168_255/0.35),0_12px_40px_-10px_rgb(23_105_255/0.75)] " +
  "hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.3),0_0_0_1px_rgb(84_168_255/0.5),0_16px_52px_-10px_rgb(23_105_255/0.9)] " +
  "before:pointer-events-none before:absolute before:inset-y-0 before:-left-1/2 before:w-1/3 before:-skew-x-12 " +
  "before:bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.28),transparent)] before:transition-transform before:duration-700 " +
  "before:ease-(--ease-jeipy) hover:before:translate-x-[420%]";

const sizes: Record<ButtonSize, string> = {
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-6 text-[15px] sm:h-14 sm:px-7",
};

/** Botón-enlace de marca. Todos los CTA del sitio navegan, por eso es un <a>. */
export function ButtonLink({
  href,
  children,
  variant = "primary",
  size = "md",
  withArrow = false,
  glow = false,
  className,
  onClick,
  "aria-label": ariaLabel,
}: ButtonLinkProps) {
  const external = isExternalHref(href);
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(base, variants[variant], sizes[size], glow && glowStyles, className)}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
      {withArrow && <ArrowIcon />}
    </Link>
  );
}
