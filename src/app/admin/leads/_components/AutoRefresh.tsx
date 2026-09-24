"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * La bandeja se vuelve a leer de la base de datos cada `seconds` segundos y al volver a la
 * pestaña, así una solicitud nueva aparece sin recargar ni tocar código.
 */
export function AutoRefresh({ seconds = 20, renderedAt }: { seconds?: number; renderedAt: string }) {
  const router = useRouter();
  const [now, setNow] = useState(() => new Date(renderedAt).getTime());

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const interval = window.setInterval(refresh, seconds * 1000);
    const tick = window.setInterval(() => setNow(Date.now()), 5000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(interval);
      window.clearInterval(tick);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router, seconds]);

  const ago = Math.max(0, Math.round((now - new Date(renderedAt).getTime()) / 1000));
  return (
    <p className="flex items-center gap-2 text-xs text-mist" aria-live="polite">
      <span aria-hidden className="size-1.5 animate-jp-pulse rounded-full bg-glow" />
      Se actualiza automáticamente · hace {ago < 5 ? "un momento" : `${ago} s`}
      <button type="button" onClick={() => router.refresh()} className="ml-1 text-glow underline-offset-4 hover:underline">
        Actualizar
      </button>
    </p>
  );
}
