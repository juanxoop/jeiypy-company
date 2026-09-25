import type { NextRequest } from "next/server";
import { isAdmin } from "@/server/admin/auth";
import { safeEqual } from "@/server/admin/session";
import { lastPersistenceFailure, recentFailureCount, reportPersistenceFailure } from "@/server/leads/alerts";
import { leadsConfig } from "@/server/leads/config";
import { leadPersistenceProbe } from "@/server/leads/probe";
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
 * - ?probe=lead: además, guarda y lee un lead de prueba con el payload real de Jeipy AI y compara
 *   el schema de producción (ver `probe.ts`). Devuelve el error exacto de Supabase si falla.
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
  const probeRequested = request.nextUrl.searchParams.get("probe") === "lead";
  const [read, write] = await Promise.all([storeHealth(), storeWriteCheck()]);
  // El diagnóstico corre aunque la lectura falle: así devuelve el error exacto de la escritura.
  const probe = probeRequested ? await leadPersistenceProbe() : undefined;
  if (probe && !probe.ok) {
    const failed = probe.steps.find((s) => !s.ok);
    console.error(`[leads ${requestId}] ERROR DE PERSISTENCIA en el diagnóstico (${failed?.step}).`, JSON.stringify(failed));
  }
  const ok = read.ok && write.ok && (probe?.ok ?? true);
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
      lastPersistenceFailure: lastPersistenceFailure() ?? null,
      ...(probe ? { leadProbe: probe } : {}),
    },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
