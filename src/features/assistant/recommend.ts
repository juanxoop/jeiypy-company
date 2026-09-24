/**
 * Recomendación de plan. Combina varias respuestas del diagnóstico (nunca una sola palabra)
 * y explica la elección frente al plan vecino, como lo haría un buen asesor.
 */
import { formatCop, getPlan, planPriceValue } from "./knowledge";
import { isKnownBusiness } from "./nlu";
import type { Feature, MessageBlock, PlanId, Profile } from "./types";

type Recommendation = Extract<MessageBlock, { type: "recommendation" }> & {
  /** Frase principal: por qué este plan, comparado con el vecino. */
  verdict: string;
  /** El caso necesita revisión humana (p. ej. presupuesto por debajo del plan de entrada). */
  needsHuman: boolean;
};

const ORDER: PlanId[] = ["basico", "esencial", "premium"];
const rank = (id: PlanId) => ORDER.indexOf(id);

const NEED_LABEL: Partial<Record<Feature, string>> = {
  booking: "reservas",
  integrations: "integraciones con otras herramientas",
  ai: "atención automatizada",
  catalog: "mostrar tus servicios o productos",
  forms: "recibir solicitudes por formulario",
  seo: "aparecer en Google",
};

const joinNatural = (items: string[]) =>
  items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;

/** Señales del diagnóstico agrupadas por el nivel de plan que requieren. */
function signals(profile: Profile) {
  const f = profile.features;
  const premium: Feature[] = [];
  if (f.booking) premium.push("booking");
  if (f.integrations) premium.push("integrations");
  // La IA empuja a Premium cuando automatizar es un objetivo, no un extra.
  const automationIsCore = Boolean(f.ai) && profile.goal === "automate";
  if (automationIsCore) premium.push("ai");

  const esencial: Feature[] = [];
  if (f.catalog) esencial.push("catalog");
  if (f.forms) esencial.push("forms");
  if (f.seo) esencial.push("seo");
  const wantsClients = profile.goal === "clients" || profile.goal === "sell";

  return { premium, esencial, wantsClients, aiAsExtra: Boolean(f.ai) && !automationIsCore };
}

/** Plan que mejor encaja con el perfil, opcionalmente limitado a un plan máximo. */
export function pickPlan(profile: Profile, cap?: PlanId): PlanId {
  const s = signals(profile);
  let plan: PlanId;
  if (s.premium.includes("booking") || s.premium.includes("integrations") || s.premium.length >= 2) plan = "premium";
  else if (s.premium.length === 1 && (s.esencial.length > 0 || s.wantsClients)) plan = "premium";
  else if (s.esencial.length > 0 || s.wantsClients || s.aiAsExtra || profile.goal === "showcase") plan = "esencial";
  else plan = "basico";
  return cap && rank(plan) > rank(cap) ? cap : plan;
}

export function recommendPlan(profile: Profile, cap?: PlanId): Recommendation {
  const planId = pickPlan(profile, cap);
  const plan = getPlan(planId);
  const s = signals(profile);
  const business = isKnownBusiness(profile.businessType) ? `tu ${profile.businessType}` : "tu negocio";
  const reasons: string[] = [];
  let verdict: string;
  let alternative: string | undefined;

  if (planId === "premium") {
    const f = profile.features;
    const needs = (["booking", "integrations", "ai"] as Feature[]).filter((k) => f[k]).map((k) => NEED_LABEL[k]!);
    verdict = `Por lo que me cuentas, **Premium** encaja mejor porque necesitas ${joinNatural(needs.length ? needs : ["una solución más automatizada"])}.`;
    if (profile.features.booking) reasons.push("Reservas o agendamiento: Premium incluye flujos personalizados y Jeipy AI puede gestionarlas según el proyecto.");
    if (profile.features.integrations) reasons.push("Integraciones: forman parte del desarrollo personalizado de Premium.");
    if (profile.features.ai) reasons.push("Atención automatizada: en Premium, Jeipy AI es parte central de la propuesta.");
    if (profile.features.catalog) reasons.push("Catálogo avanzado para mostrar lo que ofrece " + business + ".");
    alternative = "El Esencial podría cubrir la web y la captación de clientes, pero no incluye reservas, integraciones ni el mismo nivel de automatización.";
  } else if (planId === "esencial") {
    const needs = s.esencial.map((f) => NEED_LABEL[f]!);
    if (s.wantsClients) needs.push("captar clientes desde la web");
    verdict = `Por lo que me cuentas, **Esencial** es el que tiene más sentido: quieres ${joinNatural(needs.length ? needs : ["una presencia más completa"])}.`;
    if (profile.features.catalog) reasons.push(`Incluye catálogo de productos o servicios para ${business}.`);
    if (s.wantsClients || profile.features.forms)
      reasons.push("Incluye formularios de contacto o cotización, SEO básico y Analytics para medir resultados.");
    reasons.push("Varias secciones, integración con WhatsApp y optimización de velocidad.");
    if (profile.features.ai) reasons.push("Jeipy AI puede sumarse como mejora opcional para responder preguntas frecuentes.");
    alternative =
      cap === "esencial"
        ? "Lo que dejarías para más adelante son las reservas, integraciones y la automatización avanzada de Premium."
        : "El Básico se quedaría corto porque no incluye catálogo ni formularios, y Premium solo vale la pena si necesitas reservas, integraciones o automatización avanzada.";
  } else {
    verdict = `Por lo que me cuentas, **Básico** cubre bien lo que necesitas: una presencia profesional y clara para ${business}.`;
    reasons.push("Página informativa con diseño responsive.");
    reasons.push("WhatsApp, ubicación, contacto e información del negocio.");
    alternative =
      cap === "basico"
        ? "Lo que dejarías para más adelante es el catálogo, los formularios y el SEO básico del Esencial."
        : "Si más adelante quieres mostrar un catálogo o captar clientes con formularios, puedes crecer a Esencial sin empezar de cero.";
  }

  if (profile.website === "social") reasons.push("Hoy dependes de redes: tendrías un espacio propio que transmite más confianza.");

  const notes: string[] = [];
  let needsHuman = false;
  if (profile.features.ai || planId === "premium") {
    notes.push("Jeipy AI puede requerir configuración inicial y una mensualidad según uso, complejidad e integraciones.");
  }
  if (profile.budget && profile.budget !== "skipped") {
    const budget = profile.budget.amount;
    const entry = planPriceValue(getPlan("basico"));
    if (budget < entry) {
      needsHuman = true;
      notes.push(`Tu presupuesto (${formatCop(budget)}) está por debajo del plan de entrada (desde ${formatCop(entry)}). Lo mejor es revisarlo con el equipo.`);
    } else if (budget < planPriceValue(plan)) {
      const fitting = [...ORDER].reverse().find((id) => planPriceValue(getPlan(id)) <= budget);
      if (fitting && fitting !== planId) {
        notes.push(`Con tu presupuesto (${formatCop(budget)}) podrías empezar con ${getPlan(fitting).name} y crecer después.`);
      }
    }
  }

  return { type: "recommendation", planId, reasons: reasons.slice(0, 4), alternative, notes, verdict, needsHuman };
}

/** Plan inmediatamente inferior (para objeciones de precio). */
export function lowerPlan(planId: PlanId): PlanId | undefined {
  return ORDER[rank(planId) - 1];
}
