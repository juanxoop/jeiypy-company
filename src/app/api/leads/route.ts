import type { NextRequest } from "next/server";
import type { LeadSubmitResult } from "@/features/leads/types";
import { isRateLimited } from "@/server/leads/rate-limit";
import { leadsStatus, processLead } from "@/server/leads/service";
import { validateLead } from "@/server/leads/validate";

/**
 * POST /api/leads: recibe un lead del asistente Jeipy AI, lo guarda y avisa al equipo.
 * Todas las claves se leen en el servidor; el navegador solo recibe si funcionó.
 */
const json = (body: LeadSubmitResult, status: number) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: NextRequest) {
  // Solo peticiones desde el propio sitio.
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.headers.get("host")) return json({ ok: false, error: "invalid" }, 403);

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
  if (isRateLimited(ip)) return json({ ok: false, error: "rate-limited" }, 429);

  const raw = await request.text();
  if (raw.length > 100_000) return json({ ok: false, error: "invalid" }, 413);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ ok: false, error: "invalid" }, 400);
  }

  // Campo trampa: los bots lo rellenan, las personas no lo ven.
  if (body && typeof body === "object" && (body as Record<string, unknown>).company) {
    return json({ ok: true, stored: false, notified: false }, 200);
  }

  const validation = validateLead(body);
  if (!validation.ok) return json({ ok: false, error: "invalid" }, 400);

  const result = await processLead(validation.lead, { userAgent: request.headers.get("user-agent") ?? undefined });
  if (!result.configured) return json({ ok: false, error: "not-configured" }, 503);
  if (!result.stored && !result.notified) return json({ ok: false, error: "failed" }, 502);
  return json({ ok: true, stored: result.stored, notified: result.notified }, 200);
}

/** GET /api/leads: diagnóstico de qué está conectado (sin valores secretos). */
export async function GET() {
  return Response.json(leadsStatus(), { headers: { "Cache-Control": "no-store" } });
}
