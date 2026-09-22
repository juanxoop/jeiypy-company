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
  ghost: "text-mist hover:text-snow",
};

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
      className={cn(base, variants[variant], sizes[size], className)}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
      {withArrow && <ArrowIcon />}
    </Link>
  );
}
