import "server-only";

/**
 * Límites por IP, en memoria (en serverless cada instancia tiene los suyos): protección básica
 * contra abuso, no un límite exacto.
 *
 * Reglas para no bloquear clientes reales:
 * - Los intentos bloqueados NO renuevan la ventana (antes un navegador que reintentaba cada
 *   60 s quedaba bloqueado para siempre).
 * - Con `id`, reenviar lo mismo (p. ej. reintentar el mismo lead) no consume cupo: solo cuenta
 *   una vez por id. Guardar un lead es idempotente (upsert por conversación).
 */
type Options = { max: number; windowMs: number; id?: string };

const hits = new Map<string, { t: number; id?: string }[]>();

export const LIMITS = {
  /** Leads distintos por IP cada 10 min (redes móviles y oficinas comparten IP). */
  lead: { max: 30, windowMs: 10 * 60_000 },
  login: { max: 6, windowMs: 10 * 60_000 },
  health: { max: 30, windowMs: 10 * 60_000 },
} as const;

export function isRateLimited(key: string, { max, windowMs, id }: Options): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((h) => now - h.t < windowMs);
  if (id && recent.some((h) => h.id === id)) {
    hits.set(key, recent);
    return false;
  }
  if (recent.length >= max) {
    hits.set(key, recent);
    return true;
  }
  recent.push({ t: now, id });
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return false;
}
