"use client";

import { AnimatePresence, m } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { ArrowIcon } from "@/components/icons/ArrowIcon";
import { mainNav, siteConfig } from "@/config/site";
import { cn } from "@/lib/cn";
import { easeJeipy } from "@/lib/motion";

type MobileMenuProps = {
  open: boolean;
  onNavigate: () => void;
  activeId: string | null;
  contactHref: string;
};

export function MobileMenu({ open, onNavigate, activeId, contactHref }: MobileMenuProps) {
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (open) firstLinkRef.current?.focus({ preventScroll: true });
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <m.div
          id="mobile-menu"
          key="mobile-menu"
          className="fixed inset-x-0 top-18 bottom-0 overflow-y-auto border-t border-line bg-ink/[0.985] backdrop-blur-xl lg:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.25 } }}
          transition={{ duration: 0.35, ease: easeJeipy }}
        >
          <div aria-hidden className="pointer-events-none absolute inset-0 jp-grid opacity-40 jp-noise-fade" />
          <div className="relative flex min-h-full flex-col px-5 pt-6 pb-8 sm:px-8">
            <ul className="flex flex-col">
              {mainNav.map((item, index) => {
                const isActive = activeId === item.href.slice(1);
                return (
                  <m.li
                    key={item.href}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: easeJeipy, delay: 0.05 + index * 0.05 }}
                    className="border-b border-line"
                  >
                    <Link
                      ref={index === 0 ? firstLinkRef : undefined}
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={isActive ? "location" : undefined}
                      className="group flex items-center justify-between gap-4 py-5"
                    >
                      <span className="flex items-baseline gap-4">
                        <span className={cn("font-mono text-xs", isActive ? "text-glow" : "text-mist/70")}>
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="text-[1.75rem] font-semibold tracking-[-0.03em] text-snow">{item.label}</span>
                      </span>
                      <ArrowIcon className="size-5 text-mist group-hover:text-glow" />
                    </Link>
                  </m.li>
                );
              })}
            </ul>

            <m.div
              className="mt-auto pt-10"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: easeJeipy, delay: 0.3 }}
            >
              <ButtonLink href={contactHref} onClick={onNavigate} size="lg" withArrow className="w-full">
                Empezar proyecto
              </ButtonLink>
              <p className="mt-6 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-mist">
                {siteConfig.name} · {siteConfig.slogan}
              </p>
            </m.div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
