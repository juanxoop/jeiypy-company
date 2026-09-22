import { MARK_J_PATH, MARK_NODE, MARK_P_PATH, MARK_STROKE, MARK_VIEWBOX } from "./mark-paths";

/** Versión del símbolo para ImageResponse (Satori): solo atributos SVG básicos. */
export function MarkImage({ size, tile = true }: { size: number; tile?: boolean }) {
  return (
    <svg width={size} height={size} viewBox={MARK_VIEWBOX}>
      {tile && <rect width="64" height="64" rx="16" fill="#0E1420" />}
      <g transform={tile ? "translate(6.4 6.4) scale(0.8)" : undefined}>
        <path d={MARK_J_PATH} fill="none" stroke="#F5F7FA" strokeWidth={MARK_STROKE} strokeLinecap="square" />
        <path d={MARK_P_PATH} fill="none" stroke="#F5F7FA" strokeWidth={MARK_STROKE} strokeLinecap="square" />
        <circle cx={MARK_NODE.cx} cy={MARK_NODE.cy} r={MARK_NODE.r} fill="#54A8FF" />
      </g>
    </svg>
  );
}
