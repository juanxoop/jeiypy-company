import "server-only";
import { siteConfig } from "@/config/site";
import { presenceLabel } from "@/features/leads/labels";
import { CONTACT_CHANNEL_LABEL, LEAD_STATUS_LABEL, recommendationLabel } from "@/features/leads/report";
import type { LeadRecord } from "@/features/leads/types";

const escape = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Correo para el equipo: el resumen comercial primero, el historial al final. */
export function renderLeadEmail(lead: LeadRecord, id?: string) {
  const inboxUrl = id ? `${siteConfig.url}/admin/leads/${id}` : `${siteConfig.url}/admin/leads`;
  const prefix = lead.callbackRequested ? "📞 Solicita llamada" : lead.status === "cotizacion" ? "Cotización" : "Nuevo lead";
  const business = lead.businessName ?? lead.businessType ?? "negocio sin especificar";
  const subject = `${lead.isUpdate ? "Actualización · " : ""}${prefix} — ${lead.name} · ${business}`;

  const phoneDigits = lead.phone.replace(/\D/g, "");
  const rows: [string, string][] = [
    ["Estado", LEAD_STATUS_LABEL[lead.status]],
    ["Cliente", lead.name],
    ["Negocio", [lead.businessName, lead.businessType].filter(Boolean).join(" · ") || "—"],
    ["Teléfono", lead.phone],
    ...(lead.email ? ([["Email", lead.email]] as [string, string][]) : []),
    ...(lead.preferredChannel ? ([["Canal preferido", CONTACT_CHANNEL_LABEL[lead.preferredChannel]]] as [string, string][]) : []),
    ["Presencia digital", presenceLabel(lead.channels, lead.websiteStatus) ?? "—"],
    ["Necesita", lead.needs.join(" + ") || "—"],
    ["Interés en IA", lead.aiInterest ? `Sí${lead.aiLevel === "advanced" ? " · automatización avanzada" : " · atención básica"}` : "No por ahora"],
    ["Presupuesto", lead.budget ? `$${lead.budget.toLocaleString("es-CO")} COP` : "No indicado"],
    ["Recomendación", recommendationLabel(lead) ?? "—"],
    ["Solicita llamada", lead.callbackRequested ? `Sí${lead.preferredTime ? ` · ${lead.preferredTime}` : ""}` : "No"],
  ];

  const transcriptText = lead.transcript?.map((m) => `${m.role === "user" ? "Cliente" : "Jeipy AI"}: ${m.text}`).join("\n");

  const html = `<!doctype html><html><body style="margin:0;background:#f5f7fa;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#0a1224">
<div style="max-width:560px;margin:0 auto;padding:24px">
  <div style="background:#05070b;color:#f5f7fa;border-radius:16px 16px 0 0;padding:20px 24px">
    <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#54a8ff">${escape(lead.isUpdate ? "Actualización de lead" : "Nuevo lead")} — Jeipy Company</div>
    <div style="font-size:20px;font-weight:600;margin-top:6px">${escape(lead.name)} · ${escape(business)}</div>
  </div>
  <div style="background:#fff;border-radius:0 0 16px 16px;padding:20px 24px;border:1px solid #e3e8ef;border-top:0">
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      ${rows
        .map(
          ([label, value]) =>
            `<tr><td style="padding:6px 0;color:#8994a7;width:140px;vertical-align:top">${escape(label)}</td><td style="padding:6px 0;font-weight:500">${escape(value)}</td></tr>`,
        )
        .join("")}
    </table>
    <div style="margin-top:16px;padding:14px 16px;background:#f5f7fa;border-radius:12px;font-size:14px;line-height:1.55">
      <div style="font-size:12px;color:#8994a7;margin-bottom:4px">Resumen</div>${escape(lead.summary)}
    </div>
    <div style="margin-top:18px">
      <a href="tel:${phoneDigits}" style="display:inline-block;background:#1769ff;color:#fff;text-decoration:none;padding:10px 16px;border-radius:999px;font-size:14px;font-weight:600">Llamar</a>
      <a href="${escape(inboxUrl)}" style="display:inline-block;margin-right:8px;background:#05070b;color:#fff;text-decoration:none;padding:10px 16px;border-radius:999px;font-size:14px;font-weight:600">Abrir en la bandeja</a>
      <a href="https://wa.me/${phoneDigits.length === 10 ? `57${phoneDigits}` : phoneDigits}" style="display:inline-block;margin-left:8px;color:#1769ff;text-decoration:none;padding:10px 16px;border:1px solid #1769ff;border-radius:999px;font-size:14px;font-weight:600">WhatsApp</a>
    </div>
    ${
      transcriptText
        ? `<details style="margin-top:20px;font-size:13px"><summary style="cursor:pointer;color:#8994a7">Conversación completa</summary><pre style="white-space:pre-wrap;font-family:inherit;line-height:1.5">${escape(transcriptText)}</pre></details>`
        : ""
    }
    <p style="margin-top:20px;font-size:12px;color:#8994a7">Este correo también es el respaldo del lead: si no aparece en la bandeja por una falla de la base de datos, aquí están todos sus datos.</p>
    <p style="margin-top:8px;font-size:12px;color:#8994a7">Recibido ${escape(new Date(lead.createdAt).toLocaleString("es-CO", { timeZone: "America/Bogota" }))} · El cliente autorizó ser contactado sobre esta solicitud.</p>
  </div>
</div></body></html>`;

  const text = [lead.report, "", `Bandeja: ${inboxUrl}`, ...(transcriptText ? ["", "— Conversación —", transcriptText] : [])].join("\n");
  return { subject, html, text };
}
