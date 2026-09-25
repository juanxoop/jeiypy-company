"use server";

import { requireAdmin } from "@/server/admin/auth";
import { leadsConfig } from "@/server/leads/config";
import { sendEmail } from "@/server/leads/notify";

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

/** Envía un mensaje REAL de prueba al webhook de respaldo. */
export async function testBackupWebhook(): Promise<TestState> {
  await requireAdmin();
  const url = leadsConfig.backupWebhookUrl;
  if (!url) return { ok: false, message: "No configurado: falta LEADS_BACKUP_WEBHOOK_URL (o LEADS_ALERT_WEBHOOK_URL)." };
  try {
    const text = "🧪 Prueba del webhook de respaldo de leads — Jeipy. Si ves este mensaje, el respaldo funciona.";
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, content: text, test: true }),
      signal: AbortSignal.timeout(6_000),
    });
    if (!response.ok) return { ok: false, message: `El webhook respondió ${response.status}: ${(await response.text()).slice(0, 200)}` };
    return { ok: true, message: "El webhook aceptó el mensaje. Confirma que apareció en el canal." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}
