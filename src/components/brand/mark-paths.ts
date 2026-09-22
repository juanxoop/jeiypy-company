/**
 * Geometría temporal del símbolo JP (viewBox 64×64).
 * Cuando exista el SVG oficial basta con reemplazar estos trazos
 * (o el contenido de <JpMark />) y todo el sitio, favicon incluido, se actualiza.
 */
export const MARK_VIEWBOX = "0 0 64 64";
export const MARK_STROKE = 6;

/** J: asta vertical con curva inferior. */
export const MARK_J_PATH = "M27 15V37.5C27 43.85 21.85 49 15.5 49H14";
/** P: asta completa y panza. */
export const MARK_P_PATH = "M37 49V15H43C48.52 15 53 19.48 53 25C53 30.52 48.52 35 43 35H37";
/** Nodo de acento: el único punto de color del símbolo. */
export const MARK_NODE = { cx: 51, cy: 46.5, r: 3.5 } as const;
