/**
 * Tokens de movimiento de Jeipy.
 * Curvas y duraciones compartidas para que todo el sitio se mueva igual.
 */
export const easeJeipy = [0.22, 1, 0.36, 1] as const;

export const duration = {
  fast: 0.2,
  base: 0.45,
  reveal: 0.7,
} as const;
