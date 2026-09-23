"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

export type OrbState = "idle" | "thinking";

type AssistantOrbProps = {
  className?: string;
  state?: OrbState;
  /** Sin animación (usos muy pequeños o decorativos). */
  still?: boolean;
};

/**
 * Identidad visual de Jeipy AI: un núcleo de energía dentro de una esfera de vidrio azul
 * con una órbita por la que viaja un punto de luz. Respira en reposo y se acelera al pensar.
 */
export function AssistantOrb({ className, state = "idle", still = false }: AssistantOrbProps) {
  const id = useId().replace(/:/g, "");
  const sphere = `orb-sphere-${id}`;
  const core = `orb-core-${id}`;
  const rim = `orb-rim-${id}`;

  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden
      data-state={state}
      className={cn("jp-orb shrink-0 overflow-visible", still && "jp-orb-still", className)}
    >
      <defs>
        <radialGradient id={sphere} cx="38%" cy="30%" r="75%">
          <stop offset="0" stopColor="#3d8bff" />
          <stop offset="0.38" stopColor="#1453d4" />
          <stop offset="0.72" stopColor="#0a1c45" />
          <stop offset="1" stopColor="#05070b" />
        </radialGradient>
        <radialGradient id={core} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.35" stopColor="#bfe0ff" />
          <stop offset="0.7" stopColor="#54a8ff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#54a8ff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={rim} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9fd0ff" stopOpacity="0.9" />
          <stop offset="0.5" stopColor="#54a8ff" stopOpacity="0.15" />
          <stop offset="1" stopColor="#1769ff" stopOpacity="0.6" />
        </linearGradient>
      </defs>

      {/* Esfera */}
      <circle cx="32" cy="32" r="21" fill={`url(#${sphere})`} />
      <circle cx="32" cy="32" r="20.5" fill="none" stroke={`url(#${rim})`} strokeWidth="1" />
      {/* Brillo especular */}
      <ellipse cx="25" cy="22.5" rx="7" ry="4" fill="#ffffff" opacity="0.18" transform="rotate(-28 25 22.5)" />
      {/* Núcleo */}
      <circle className="jp-orb-core" cx="32" cy="33" r="9" fill={`url(#${core})`} />

      {/* Órbita y punto de luz */}
      <g transform="rotate(-22 32 32)">
        <ellipse cx="32" cy="32" rx="29" ry="9.5" fill="none" stroke="#54a8ff" strokeOpacity="0.28" strokeWidth="0.9" />
        <ellipse
          className="jp-orb-light"
          cx="32"
          cy="32"
          rx="29"
          ry="9.5"
          fill="none"
          stroke="#bfe0ff"
          strokeWidth="1.6"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray="10 90"
        />
      </g>
    </svg>
  );
}
