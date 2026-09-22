"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** Año actual en el cliente; en el HTML estático se usa el año de compilación. */
export function CurrentYear({ fallback }: { fallback: number }) {
  const year = useSyncExternalStore(
    subscribe,
    () => new Date().getFullYear(),
    () => fallback,
  );
  return <>{year}</>;
}
