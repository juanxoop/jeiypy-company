import { cn } from "@/lib/cn";
import { MARK_J_PATH, MARK_NODE, MARK_P_PATH, MARK_STROKE, MARK_VIEWBOX } from "./mark-paths";

type JpMarkProps = {
  className?: string;
  /** Muestra el símbolo dentro de su contenedor tipo app icon. */
  tile?: boolean;
  /** Dibuja los trazos al montar (loading, hero). */
  draw?: boolean;
  /** Versión sin acento azul, para marcas de agua. */
  mono?: boolean;
  title?: string;
};

export function JpMark({ className, tile = false, draw = false, mono = false, title }: JpMarkProps) {
  const labelled = Boolean(title);
  const strokeProps = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: MARK_STROKE,
    strokeLinecap: "square" as const,
    strokeLinejoin: "miter" as const,
    pathLength: 1,
    className: draw ? "jp-mark-draw" : undefined,
  };

  return (
    <svg
      viewBox={MARK_VIEWBOX}
      className={cn("shrink-0", className)}
      role={labelled ? "img" : undefined}
      aria-hidden={labelled ? undefined : true}
      aria-label={title}
    >
      {tile && (
        <>
          <rect x="0.5" y="0.5" width="63" height="63" rx="15.5" className="fill-surface-raised" />
          <rect
            x="0.5"
            y="0.5"
            width="63"
            height="63"
            rx="15.5"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.12"
          />
        </>
      )}
      <g transform={tile ? "translate(6.4 6.4) scale(0.8)" : undefined}>
        <path d={MARK_J_PATH} {...strokeProps} />
        <path d={MARK_P_PATH} {...strokeProps} style={draw ? { animationDelay: "180ms" } : undefined} />
        <circle
          cx={MARK_NODE.cx}
          cy={MARK_NODE.cy}
          r={MARK_NODE.r}
          className={cn(mono ? "fill-current" : "fill-glow", draw && "jp-mark-node")}
        />
      </g>
    </svg>
  );
}
