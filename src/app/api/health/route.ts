import type { NextRequest } from "next/server";
import { isAdmin } from "@/server/admin/auth";
import { safeEqual } from "@/server/admin/session";
import { recentFailureCount, reportPersistenceFailure } from "@/server/leads/alerts";
import { leadsConfig } from "@/server/leads/config";
import { configurationChecks, fallbackSummary } from "@/server/leads/status";
import { LIMITS, isRateLimited } from "@/server/leads/rate-limit";
import { storeHealth, storeWriteCheck } from "@/server/leads/store";

/**
 * GET /api/health: estado del sistema de leads.
 * - backend: el servidor responde.
 * - supabase.read: conexión y tablas.
 * - supabase.write: escritura de prueba NO destructiva (sobrescribe una fila de `lead_system_health`).
 * - email: si el canal de respaldo está configurado.
 *
 * Requiere sesión del equipo o `Authorization: Bearer <HEALTHCHECK_TOKEN>` (para monitores externos).
 * Responde 200 si todo está bien y 503 si algo falla, así un monitor puede alertar.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const tokenOk = Boolean(leadsConfig.healthToken && token && safeEqual(token, leadsConfig.healthToken));
  if (!tokenOk && !(await isAdmin())) return Response.json({ error: "unauthorized" }, { status: 401 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (isRateLimited(`health:${ip}`, LIMITS.health)) return Response.json({ error: "rate-limited" }, { status: 429 });

  const requestId = crypto.randomUUID().slice(0, 8);
  const [read, write] = await Promise.all([storeHealth(), storeWriteCheck()]);
  const ok = read.ok && write.ok;
  if (!write.ok) {
    await reportPersistenceFailure({ requestId, source: "health", reason: write.reason });
  }

  return Response.json(
    {
      status: ok ? "ok" : "degraded",
      checkedAt: new Date().toISOString(),
      backend: "ok",
      supabase: {
        read: read.ok ? "ok" : read.reason,
        write: write.ok ? `ok (${write.latencyMs} ms)` : write.reason,
      },
      persistence: read.ok && write.ok ? "ok" : "falla",
      fallback: fallbackSummary(),
      configuration: configurationChecks().map(({ label, ok, detail, level }) => ({ label, ok, detail, level })),
      recentPersistenceFailures: recentFailureCount(),
    },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
