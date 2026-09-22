"use client";

import { m, type Variants } from "framer-motion";
import type { ReactNode } from "react";
import { duration, easeJeipy } from "@/lib/motion";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** Desplazamiento vertical inicial en px. */
  y?: number;
  as?: "div" | "li" | "span";
};

const viewport = { once: true, margin: "0px 0px -12% 0px" } as const;

/** Jeipy Reveal: fade + desplazamiento vertical corto al entrar en el viewport. */
export function Reveal({ children, className, delay = 0, y = 18, as = "div" }: RevealProps) {
  const Component = m[as];
  return (
    <Component
      data-reveal
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewport}
      transition={{ duration: duration.reveal, ease: easeJeipy, delay }}
    >
      {children}
    </Component>
  );
}

const groupVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

export const revealItemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: duration.reveal, ease: easeJeipy } },
};

/** Contenedor que revela a sus hijos (<RevealItem />) en cascada. */
type RevealGroupProps = {
  children: ReactNode;
  className?: string;
  as?: "div" | "ul" | "ol";
};

export function RevealGroup({ children, className, as = "div" }: RevealGroupProps) {
  const Component = m[as];
  return (
    <Component className={className} initial="hidden" whileInView="visible" viewport={viewport} variants={groupVariants}>
      {children}
    </Component>
  );
}

export function RevealItem({ children, className, as = "div" }: Omit<RevealProps, "delay" | "y">) {
  const Component = m[as];
  return (
    <Component data-reveal className={className} variants={revealItemVariants}>
      {children}
    </Component>
  );
}
