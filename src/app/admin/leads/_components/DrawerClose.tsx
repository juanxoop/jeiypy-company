"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Cierra el panel lateral con Escape y bloquea el scroll del fondo mientras está abierto. */
export function DrawerClose({ href }: { href: string }) {
  const router = useRouter();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") router.push(href, { scroll: false });
    };
    document.documentElement.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [href, router]);
  return null;
}
