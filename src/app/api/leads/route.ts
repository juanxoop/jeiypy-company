import type { NextRequest } from "next/server";
import type { LeadSubmitResult } from "@/features/leads/types";
import { isRateLimited } from "@/server/leads/rate-limit";
import { processLead } from "@/server/leads/service";
import { validateLead } from "@/server/leads/validate";

/**
 * POST /api/leads: recibe un lead del asistente Jeipy AI y lo guarda en la base de datos.
 * Solo responde `ok: true` cuando Supabase confirmó la escritura. Los errores quedan en los
 * registros del servidor con un `requestId` que también recibe el navegador.
 */
const json = (body: LeadSubmitResult, status: number) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8);

  // Solo peticiones desde el propio sitio.
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.headers.get("host")) return json({ ok: false, error: "invalid", requestId }, 403);

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
  if (isRateLimited(`lead:${ip}`)) return json({ ok: false, error: "rate-limited", requestId }, 429);

  const raw = await request.text();
  if (raw.length > 100_000) return json({ ok: false, error: "invalid", requestId }, 413);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ ok: false, error: "invalid", requestId }, 400);
  }

  // Campo trampa: los bots lo rellenan, las personas no lo ven. No se guarda nada.
  if (body && typeof body === "object" && (body as Record<string, unknown>).company) {
    return json({ ok: false, error: "invalid", requestId }, 400);
  }

  const validation = validateLead(body);
  if (!validation.ok) {
    console.warn(`[leads ${requestId}] Solicitud inválida: ${validation.reason}`);
    return json({ ok: false, error: "invalid", requestId }, 400);
  }

  const result = await processLead(validation.lead, { userAgent: request.headers.get("user-agent") ?? undefined, requestId });
  if (!result.ok) return json({ ok: false, error: result.reason, requestId }, result.reason === "not-configured" ? 503 : 502);
  return json({ ok: true, id: result.id, notified: result.notified }, 201);
}
