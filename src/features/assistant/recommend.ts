/**
 * Recomendación de plan a partir del perfil. Cada decisión deja una razón
 * legible para que el asistente explique por qué recomienda lo que recomienda.
 */
import { formatCop, getPlan, planPriceValue } from "./knowledge";
import { isBookingBusiness, isKnownBusiness } from "./nlu";
import type { MessageBlock, PlanId, Profile } from "./types";

type Recommendation = Extract<MessageBlock, { type: "recommendation" }> & {
  /** El caso necesita revisión humana (p. ej. presupuesto por debajo del plan de entrada). */
  needsHuman: boolean;
};

const ORDER: PlanId[] = ["basico", "esencial", "premium"];

export function recommendPlan(profile: Profile): Recommendation {
  const f = profile.features;
  const business = isKnownBusiness(profile.businessType) ? `tu ${profile.businessType}` : "tu negocio";
  const reasons: string[] = [];
  let planId: PlanId;

  if (f.booking || f.integrations) {
    planId = "premium";
    if (f.booking) reasons.push("Necesitas reservas o agendamiento: Premium incluye flujos personalizados y Jeipy AI puede gestionar reservas según el proyecto.");
    if (f.integrations) reasons.push("Mencionaste integraciones con otras herramientas, que forman parte del desarrollo personalizado de Premium.");
    if (f.ai) reasons.push("Quieres automatizar la atención: en Premium, Jeipy AI es parte central de la propuesta.");
    if (f.catalog) reasons.push("Premium incluye catálogo avanzado para mostrar tus servicios o productos.");
  } else if (f.catalog || f.forms || f.ai || profile.goal === "clients" || profile.goal === "sell" || f.seo) {
    planId = "esencial";
    if (f.catalog) reasons.push(`Quieres mostrar lo que ofrece ${business}: Esencial incluye catálogo de productos o servicios.`);
    if (profile.goal === "clients" || profile.goal === "sell")
      reasons.push("Tu objetivo es conseguir clientes: incluye formularios de contacto o cotización, SEO básico y Analytics para medir resultados.");
    if (f.forms && !(profile.goal === "clients" || profile.goal === "sell")) reasons.push("Incluye formularios de contacto o cotización.");
    if (f.seo) reasons.push("Incluye SEO básico para que te encuentren en buscadores.");
    if (f.ai) reasons.push("Como quieres automatizar preguntas frecuentes, puedes sumarle Jeipy AI como mejora opcional.");
  } else {
    planId = "basico";
    reasons.push(`Buscas una presencia profesional y clara para ${business}: Básico incluye página informativa, WhatsApp, ubicación y contacto.`);
    if (profile.website !== "yes") reasons.push("Es una muy buena base para empezar y crecer después sin rehacer todo.");
  }

  if (profile.website === "social") reasons.push("Hoy dependes de redes sociales: tendrás un espacio propio que transmite más confianza.");
  if (profile.website === "no" && planId !== "basico") reasons.push("Como aún no tienes web, partirías con una estructura completa desde el inicio.");

  const alternative = buildAlternative(planId, profile);
  const notes: string[] = [];
  let needsHuman = false;

  if (f.ai || planId === "premium") {
    notes.push("Jeipy AI puede requerir configuración inicial y una mensualidad según uso, complejidad e integraciones.");
  }

  if (profile.budget && profile.budget !== "skipped") {
    const budget = profile.budget.amount;
    const price = planPriceValue(getPlan(planId));
    const entry = planPriceValue(getPlan("basico"));
    if (budget < entry) {
      needsHuman = true;
      notes.push(
        `Tu presupuesto (${formatCop(budget)}) está por debajo del plan de entrada (desde ${formatCop(entry)}). Un asesor puede revisar contigo qué es posible.`,
      );
    } else if (budget < price) {
      const fitting = [...ORDER].reverse().find((id) => planPriceValue(getPlan(id)) <= budget);
      if (fitting && fitting !== planId) {
        notes.push(
          `Con tu presupuesto (${formatCop(budget)}) podrías empezar con ${getPlan(fitting).name} y ampliar después hacia ${getPlan(planId).name}.`,
        );
      }
    }
  }

  return { type: "recommendation", planId, reasons: reasons.slice(0, 4), alternative, notes, needsHuman };
}

function buildAlternative(planId: PlanId, profile: Profile): string | undefined {
  const f = profile.features;
  if (planId === "esencial") {
    if (f.booking !== true && isBookingBusiness(profile.businessType))
      return "Si además quieres reservas automáticas y un asistente inteligente que atienda consultas, te convendría Premium.";
    if (!f.ai) return "Si más adelante quieres automatizar la atención, puedes sumar Jeipy AI como mejora opcional.";
    return "Si más adelante necesitas reservas o integraciones con otras herramientas, Premium es el siguiente paso.";
  }
  if (planId === "premium") {
    return "Si por ahora no necesitas reservas, integraciones ni automatización avanzada, el Esencial podría ser suficiente.";
  }
  return "Si quieres mostrar catálogo, recibir cotizaciones por formulario o aparecer mejor en Google, te convendría Esencial.";
}
