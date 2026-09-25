import type { NextRequest } from "next/server";
import type { LeadSubmitResult } from "@/features/leads/types";
import { LIMITS, isRateLimited } from "@/server/leads/rate-limit";
import { processLead } from "@/server/leads/service";
import { validateLead } from "@/server/leads/validate";

/**
 * POST /api/leads: recibe un lead del asistente Jeipy AI y lo guarda en la base de datos.
 * Solo responde `ok: true` cuando Supabase confirmó la escritura. Los errores quedan en los
 * registros del servidor con un `requestId` que también recibe el navegador.
 */

/** Reintentos contra Supabase (≈19 s en el peor caso) + verificación + respaldo: margen sin colgar al cliente. */
export const maxDuration = 40;

const json = (body: LeadSubmitResult, status: number) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8);

  // Solo peticiones desde el propio sitio (detrás de Vercel o un proxy, el dominio también llega en x-forwarded-host).
  const origin = request.headers.get("origin");
  if (origin) {
    let originHost = "";
    try {
      originHost = new URL(origin).host;
    } catch {
      /* origen malformado: se rechaza abajo */
    }
    const hosts = [request.headers.get("host"), ...(request.headers.get("x-forwarded-host") ?? "").split(",").map((h) => h.trim())].filter(Boolean);
    if (!hosts.includes(originHost)) {
      console.warn(`[leads ${requestId}] Origen rechazado: ${originHost || origin.slice(0, 80)} no coincide con ${hosts.join(", ") || "(sin host)"}`);
      return json({ ok: false, error: "invalid", requestId }, 403);
    }
  }

  const raw = await request.text();
  // Margen amplio: el historial se recorta en el cliente y en el servidor; un lead real nunca debe rechazarse por tamaño.
  if (raw.length > 1_000_000) {
    console.warn(`[leads ${requestId}] Solicitud demasiado grande (${raw.length} bytes)`);
    return json({ ok: false, error: "invalid", requestId }, 413);
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ ok: false, error: "invalid", requestId }, 400);
  }

  // Límite por IP contando leads distintos: reintentar el mismo lead nunca queda bloqueado.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
  const conversationId = typeof (body as Record<string, unknown>)?.conversationId === "string" ? String((body as Record<string, unknown>).conversationId) : undefined;
  if (isRateLimited(`lead:${ip}`, { ...LIMITS.lead, id: conversationId })) {
    console.warn(`[leads ${requestId}] Límite de solicitudes alcanzado para ${ip}`);
    return json({ ok: false, error: "rate-limited", requestId }, 429);
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
  if (!result.ok) {
    return json({ ok: false, error: result.reason, requestId, backup: result.backup }, result.reason === "not-configured" ? 503 : 502);
  }
  return json({ ok: true, id: result.id, notified: result.notified }, 201);
}
