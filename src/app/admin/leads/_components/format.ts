import { getAiTier } from "@/data/jeipyAi";
import { plans } from "@/data/plans";
import { LEAD_STATUS_LABEL } from "@/features/leads/report";
import type { LeadRow, LeadStatus } from "@/features/leads/types";

export function formatDate(iso: string, withTime = true): string {
  return new Date(iso).toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export const planName = (lead: LeadRow) => (lead.recommendedPlan ? (plans.find((p) => p.id === lead.recommendedPlan)?.name ?? lead.recommendedPlan) : "—");
export const aiName = (lead: LeadRow) => (lead.recommendedAi ? getAiTier(lead.recommendedAi).name : lead.aiInterest ? "Interesado" : "—");
export const businessName = (lead: LeadRow) =>
  [lead.businessName, lead.businessType].filter(Boolean).join(" · ") || "Sin especificar";
export const needsText = (lead: LeadRow) => lead.needs.join(" + ") || (lead.callbackRequested ? "Solicita llamada" : "—");

export const statusLabel = (status: LeadStatus) => LEAD_STATUS_LABEL[status] ?? status;

const TONE: Record<LeadStatus, string> = {
  nuevo: "border-glow/40 bg-jeipy/15 text-glow",
  "solicita-llamada": "border-[#ffb547]/40 bg-[#ffb547]/10 text-[#ffc97a]",
  cotizacion: "border-[#a78bfa]/40 bg-[#a78bfa]/10 text-[#c4b5fd]",
  interesado: "border-[#34d399]/35 bg-[#34d399]/10 text-[#6ee7b7]",
  contactado: "border-line-strong bg-white/[0.05] text-snow/85",
  cerrado: "border-[#34d399]/50 bg-[#34d399]/20 text-[#a7f3d0]",
  "no-interesado": "border-line bg-white/[0.02] text-mist",
};
export const statusTone = (status: LeadStatus) => TONE[status] ?? TONE.contactado;

/** Número para tel: y wa.me. Números colombianos de 10 dígitos reciben el indicativo 57. */
export function phoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 && digits.startsWith("3") ? `57${digits}` : digits;
}

export function whatsappHref(lead: LeadRow): string {
  const first = lead.name.split(" ")[0];
  const text = `Hola ${first}, te escribimos de Jeipy Company por la solicitud que dejaste con Jeipy AI.`;
  return `https://wa.me/${phoneDigits(lead.phone)}?text=${encodeURIComponent(text)}`;
}
