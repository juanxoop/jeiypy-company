"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { mainNav } from "@/config/site";
import { cn } from "@/lib/cn";
import { getContactHref } from "@/lib/contact";
import { useActiveSection } from "@/lib/useActiveSection";
import { useScrolled } from "@/lib/useScrolled";
import { MobileMenu } from "./MobileMenu";

const sectionIds = mainNav.map((item) => item.href.slice(1));
const ctaMessage = "Hola Jeipy, quiero empezar un proyecto web.";

export function Navbar() {
  const scrolled = useScrolled();
  const active = useActiveSection(sectionIds);
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const contactHref = getContactHref(ctaMessage);

  const close = useCallback(() => setOpen(false), []);

  // Mientras el menú móvil está abierto: sin scroll de fondo, contenido inerte y cierre con Escape.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const background = document.querySelectorAll<HTMLElement>("main, footer");
    root.style.overflow = "hidden";
    background.forEach((el) => el.setAttribute("inert", ""));

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onResize = () => {
      if (window.matchMedia("(min-width: 1024px)").matches) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    const toggle = toggleRef.current;

    return () => {
      root.style.overflow = "";
      background.forEach((el) => el.removeAttribute("inert"));
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      toggle?.focus({ preventScroll: true });
    };
  }, [open]);

  const elevated = scrolled || open;

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={cn(
          "absolute inset-0 border-b transition-[background-color,border-color,backdrop-filter] duration-500 ease-(--ease-jeipy)",
          elevated ? "border-line bg-ink/75 backdrop-blur-xl backdrop-saturate-150" : "border-transparent bg-transparent",
        )}
      />
      <nav
        aria-label="Principal"
        className="relative mx-auto flex h-18 w-full max-w-7xl items-center justify-between gap-6 px-5 sm:px-8 lg:px-10"
      >
        <Logo onClick={close} />

        <ul className="hidden items-center gap-1 lg:flex">
          {mainNav.map((item) => {
            const isActive = active === item.href.slice(1);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "location" : undefined}
                  className={cn(
                    "relative rounded-full px-4 py-2 text-sm transition-colors duration-300",
                    isActive ? "text-snow" : "text-mist hover:text-snow",
                  )}
                >
                  {item.label}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute -bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-glow transition-[opacity,transform] duration-500 ease-(--ease-jeipy)",
                      isActive ? "scale-100 opacity-100" : "scale-0 opacity-0",
                    )}
                  />
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2">
          <div className="hidden lg:block">
            <ButtonLink href={contactHref} variant="secondary" withArrow>
              Empezar proyecto
            </ButtonLink>
          </div>

          <button
            ref={toggleRef}
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            className="relative -mr-2 grid size-11 place-items-center rounded-full text-snow transition-colors hover:bg-white/5 lg:hidden"
          >
            <span aria-hidden className="relative block h-3 w-5">
              <span
                className={cn(
                  "absolute left-0 h-[1.5px] w-5 rounded-full bg-current transition-transform duration-500 ease-(--ease-jeipy)",
                  open ? "top-1/2 -translate-y-1/2 rotate-45" : "top-0",
                )}
              />
              <span
                className={cn(
                  "absolute left-0 h-[1.5px] rounded-full bg-current transition-[transform,width] duration-500 ease-(--ease-jeipy)",
                  open ? "top-1/2 w-5 -translate-y-1/2 -rotate-45" : "bottom-0 w-3.5",
                )}
              />
            </span>
          </button>
        </div>
      </nav>

      <MobileMenu open={open} onNavigate={close} activeId={active} contactHref={contactHref} />
    </header>
  );
}
