"use server";

import { requireAdmin } from "@/server/admin/auth";
import { leadsConfig } from "@/server/leads/config";
import type { LeadSubmission } from "@/features/leads/types";
import { buildBackupWebhookPayload } from "@/server/leads/backup";
import { sendEmail } from "@/server/leads/notify";
import { buildLeadRecord } from "@/server/leads/service";

export type TestState = { ok?: boolean; message?: string };

/** Envía un correo REAL de prueba por Resend al equipo: comprueba que el respaldo por correo funciona. */
export async function testBackupEmail(): Promise<TestState> {
  await requireAdmin();
  if (!leadsConfig.resend.apiKey || !leadsConfig.recipients.length) {
    return { ok: false, message: "No configurado: faltan RESEND_API_KEY y/o JEIPY_LEADS_EMAIL." };
  }
  try {
    await sendEmail({
      to: leadsConfig.recipients,
      subject: "Prueba del respaldo de leads — Jeipy",
      text: "Correo de prueba enviado desde /admin/sistema. Si lo recibes, el respaldo por correo funciona.",
      html: "<p>Correo de prueba enviado desde <strong>/admin/sistema</strong>.</p><p>Si lo recibes, el respaldo por correo funciona.</p>",
    });
    return { ok: true, message: `Resend aceptó el correo para ${leadsConfig.recipients.join(", ")}. Confirma que llegó a la bandeja (revisa spam).` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Lead ficticio con TODOS los campos que puede traer un lead real (incluidos los opcionales),
 * para que Make detecte y mapee cada uno. Datos claramente de prueba.
 */
function testLeadRecord() {
  const submission: LeadSubmission = {
    conversationId: `prueba-webhook-${Date.now().toString(36)}`,
    consent: true,
    name: "PRUEBA JEIPY",
    phone: "300 000 0000",
    email: "prueba@example.com",
    businessName: "NEGOCIO PRUEBA",
    businessType: "tienda de ropa",
    businessDescription: "PRUEBA: tienda de ropa que vende por Instagram y WhatsApp y quiere mostrar su catálogo.",
    channels: ["whatsapp", "instagram"],
    websiteStatus: "none",
    goal: "clients",
    features: ["catalog", "forms", "ai"],
    aiInterest: true,
    aiLevel: "basic",
    recommendedPlan: "esencial",
    recommendedAi: "lite",
    budget: 2_500_000,
    intent: "callback",
    callbackRequested: true,
    preferredTime: "En la tarde (prueba)",
    preferredChannel: "whatsapp",
    isUpdate: false,
    backupNotified: false,
  };
  // Mismo armado que un lead real: estado, necesidad, resumen, reporte y fechas (createdAt, consentAt).
  return buildLeadRecord(submission, { userAgent: "Prueba desde /admin/sistema" });
}

/**
 * Envía al webhook de respaldo un lead ficticio con la MISMA estructura exacta que en un fallo
 * real (`buildBackupWebhookPayload`): text, content, lead y requestId.
 */
export async function testBackupWebhook(): Promise<TestState> {
  await requireAdmin();
  const url = leadsConfig.backupWebhookUrl;
  if (!url) return { ok: false, message: "No configurado: falta LEADS_BACKUP_WEBHOOK_URL (o LEADS_ALERT_WEBHOOK_URL)." };
  try {
    const payload = buildBackupWebhookPayload(testLeadRecord(), `PRUEBA-${crypto.randomUUID().slice(0, 8)}`);
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(6_000),
    });
    if (!response.ok) return { ok: false, message: `El webhook respondió ${response.status}: ${(await response.text()).slice(0, 200)}` };
    return {
      ok: true,
      message: `El webhook aceptó el lead de prueba "PRUEBA JEIPY" (ref ${payload.requestId}) con ${Object.keys(payload.lead).length} campos en "lead". En Make, usa "Redetermine data structure" y confirma que llegó.`,
    };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}
