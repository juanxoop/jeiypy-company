/**
 * Resumen comercial del lead: lo que el equipo lee primero.
 * Funciones puras: se usan en el servidor para el correo y la base de datos.
 */
import { getAiTier } from "@/data/jeipyAi";
import { plans } from "@/data/plans";
import { GOAL_LABEL, WEBSITE_LABEL, needsLabels } from "./labels";
import type { ContactChannel, LeadIntent, LeadStatus, LeadSubmission } from "./types";

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  nuevo: "Nuevo",
  interesado: "Interesado",
  cotizacion: "Cotización",
  "solicita-llamada": "Solicita llamada",
};

export const LEAD_INTENT_LABEL: Record<LeadIntent, string> = {
  quote: "Quiere recibir una cotización",
  callback: "Solicita una llamada",
};

export const CHANNEL_LABEL: Record<ContactChannel, string> = {
  whatsapp: "WhatsApp",
  llamada: "Llamada",
  correo: "Correo",
};

/** Prioridad interna: la acción más concreta que pidió el cliente. */
export function classifyLead(lead: Pick<LeadSubmission, "callbackRequested" | "intent" | "recommendedPlan">): LeadStatus {
  if (lead.callbackRequested) return "solicita-llamada";
  if (lead.intent === "quote") return "cotizacion";
  if (lead.recommendedPlan) return "interesado";
  return "nuevo";
}

const formatCop = (amount: number) => `$${amount.toLocaleString("es-CO")} COP`;
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
const joinNatural = (items: string[]) =>
  items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;

export function recommendationLabel(lead: Pick<LeadSubmission, "recommendedPlan" | "recommendedAi">): string | undefined {
  if (!lead.recommendedPlan) return undefined;
  const plan = plans.find((p) => p.id === lead.recommendedPlan);
  const base = plan ? `${plan.name} (desde ${plan.price})` : lead.recommendedPlan;
  return lead.recommendedAi ? `${base} + ${getAiTier(lead.recommendedAi).name}` : base;
}

function aiInterestLabel(lead: LeadSubmission): string {
  if (!lead.aiInterest) return "No por ahora";
  if (lead.recommendedAi) return `Sí · ${getAiTier(lead.recommendedAi).name}`;
  return lead.aiLevel === "advanced" ? "Sí · automatización avanzada" : "Sí · atención básica";
}

const GOAL_PHRASE = {
  clients: "conseguir más clientes",
  image: "verse más profesional",
  showcase: "mostrar sus productos o servicios",
  sell: "vender más desde la web",
  automate: "automatizar la atención",
} as const;

/** "El cliente busca conseguir más clientes para su barbería…" */
export function buildNarrative(lead: LeadSubmission): string {
  const business = lead.businessType ? `su ${lead.businessType}` : "su negocio";
  const sentences: string[] = [];
  sentences.push(lead.goal ? `El cliente busca ${GOAL_PHRASE[lead.goal]} para ${business}.` : `El cliente quiere digitalizar ${business}.`);
  if (lead.website === "social") sentences.push("Hoy trabaja solo con redes y WhatsApp.");
  if (lead.website === "no") sentences.push("Aún no tiene página web.");
  if (lead.website === "yes") sentences.push("Ya tiene página web y quiere mejorarla.");
  const needs = needsLabels(lead.goal, lead.features);
  if (needs.length) sentences.push(`Necesita ${joinNatural(needs)}.`);
  if (lead.aiInterest) {
    sentences.push(
      lead.aiLevel === "advanced"
        ? "Mostró interés alto en automatización con IA."
        : "Le interesa una IA que responda dudas y capte datos de clientes.",
    );
  }
  if (lead.budget) sentences.push(`Indicó un presupuesto aproximado de ${formatCop(lead.budget)}.`);
  if (lead.callbackRequested) {
    sentences.push(`Quiere que un asesor lo llame${lead.preferredTime ? ` (horario preferido: ${lead.preferredTime})` : ""}.`);
  } else if (lead.intent === "quote") {
    sentences.push("Quiere recibir una cotización.");
  }
  return sentences.join(" ");
}

/** Reporte completo en texto plano (correo y base de datos). */
export function buildReport(lead: LeadSubmission, status: LeadStatus): string {
  const needs = needsLabels(lead.goal, lead.features);
  const business = [lead.businessName, lead.businessType && (lead.businessName ? `(${lead.businessType})` : capitalize(lead.businessType))]
    .filter(Boolean)
    .join(" ");
  const lines: [string, string | undefined][] = [
    ["Estado", LEAD_STATUS_LABEL[status]],
    ["Cliente", lead.name],
    ["Negocio", business || undefined],
    ["Teléfono", lead.phone],
    ["Email", lead.email],
    ["Canal preferido", lead.preferredChannel ? CHANNEL_LABEL[lead.preferredChannel] : undefined],
    ["Situación actual", lead.website ? WEBSITE_LABEL[lead.website] : undefined],
    ["Objetivo", lead.goal ? GOAL_LABEL[lead.goal] : undefined],
    ["Necesita", needs.length ? needs.join(" + ") : undefined],
    ["Interés en IA", aiInterestLabel(lead)],
    ["Recomendación", recommendationLabel(lead)],
    ["Presupuesto", lead.budget ? formatCop(lead.budget) : undefined],
    ["Intención", LEAD_INTENT_LABEL[lead.intent]],
    ["Solicita llamada", lead.callbackRequested ? "Sí" : "No"],
    ["Horario preferido", lead.preferredTime],
  ];
  return [
    `${lead.isUpdate ? "Actualización de lead" : "Nuevo lead"} — Jeipy Company`,
    ...lines.filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`),
    "",
    "Resumen:",
    buildNarrative(lead),
  ].join("\n");
}
