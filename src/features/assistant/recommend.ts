/**
 * Recomendación de plan · Sales V1.
 *
 * Niveles:
 * - Básico: presencia digital (página informativa, WhatsApp, ubicación, contacto, servicios básicos).
 * - Esencial: captación, catálogo, formularios, SEO básico, Analytics, estructura comercial.
 * - Esencial + Jeipy AI Lite (opcional): lo anterior + IA ligera (dudas, orientación, datos básicos).
 * - Premium: reservas, cotizaciones o procesos automatizados, integraciones, clasificación y
 *   seguimiento de clientes. Si quiere IA, se combina con Jeipy AI Pro.
 * - Proyectos especiales (integraciones + automatización a medida): Premium + Jeipy AI Custom.
 *
 * Jeipy AI nunca está incluido en el precio del plan web: tiene configuración inicial (pago único)
 * y una operación mensual según uso, que el asistente no cuantifica.
 *
 * Mencionar "IA" no lleva a Premium: decide el nivel de automatización. Busca la solución
 * adecuada, no la más cara, y explica: plan · por qué · qué cubre · qué cambiaría la elección.
 */
import { formatCop, getAiTier, getPlan, planPriceValue } from "./knowledge";
import { isKnownBusiness } from "./nlu";
import type { AiTierId, MessageBlock, PlanId, Profile } from "./types";

type Recommendation = Extract<MessageBlock, { type: "recommendation" }> & {
  /** Frase principal que resume la recomendación. */
  verdict: string;
  /** El caso necesita revisión humana (p. ej. presupuesto por debajo del plan de entrada). */
  needsHuman: boolean;
};

export type Tier = "basico" | "esencial" | "esencial-ai" | "premium";

const ORDER: PlanId[] = ["basico", "esencial", "premium"];
const rank = (id: PlanId) => ORDER.indexOf(id);
const tierPlan = (tier: Tier): PlanId => (tier === "esencial-ai" ? "esencial" : tier);

const joinNatural = (items: string[]) =>
  items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;

/** Capacidades que solo resuelve Premium. */
function premiumNeeds(profile: Profile): string[] {
  const f = profile.features;
  const needs: string[] = [];
  if (f.booking) needs.push("reservas automatizadas");
  if (f.automation) needs.push("automatizar procesos comerciales");
  if (f.integrations) needs.push("integraciones con otras herramientas");
  if (f.ai && profile.aiLevel === "advanced") needs.push("una IA que gestione y clasifique solicitudes");
  return needs;
}

/** Necesidades comerciales que cubre Esencial. */
function esencialNeeds(profile: Profile): string[] {
  const f = profile.features;
  const needs: string[] = [];
  if (f.catalog) needs.push("catálogo de servicios o productos");
  if (profile.goal === "clients" || profile.goal === "sell") needs.push("captación de clientes");
  if (f.forms) needs.push("formularios");
  if (f.seo) needs.push("aparecer en Google");
  return needs;
}

/** La IA quedó en un nivel aún sin definir: hay que preguntar antes de elegir entre Esencial + IA y Premium. */
export function needsAiLevelQuestion(profile: Profile): boolean {
  return Boolean(profile.features.ai) && !profile.aiLevel && premiumNeeds(profile).length === 0;
}

/** Nivel recomendado, opcionalmente limitado a un plan máximo (objeción de precio). */
export function pickTier(profile: Profile, cap?: PlanId): Tier {
  const wantsAi = Boolean(profile.features.ai);
  let tier: Tier;
  if (premiumNeeds(profile).length > 0) tier = "premium";
  else if (wantsAi) tier = "esencial-ai"; // Jeipy AI se suma desde Esencial.
  else if (esencialNeeds(profile).length > 0) tier = "esencial";
  else tier = "basico";

  if (cap && rank(tierPlan(tier)) > rank(cap)) {
    tier = cap === "esencial" ? (wantsAi ? "esencial-ai" : "esencial") : cap;
  }
  return tier;
}

/**
 * Respuestas del visitante que sostienen la recomendación, con sus palabras.
 * Primero van las que justifican el plan elegido (en Premium, las de automatización).
 */
function becauseList(profile: Profile, tier: Tier): string[] {
  const f = profile.features;
  const context: string[] = [];
  if (profile.website === "social") context.push("Hoy trabajas con redes y WhatsApp, sin una web propia.");
  if (profile.website === "no") context.push("Aún no tienes página web.");
  if (profile.goal === "image") context.push("Buscas verte más profesional.");

  const commercial: string[] = [];
  if (profile.goal === "clients" || profile.goal === "sell") commercial.push("Quieres conseguir más clientes desde la web.");
  if (f.catalog) commercial.push("Quieres mostrar tus servicios o productos con precios.");
  if (f.forms) commercial.push("Quieres recibir solicitudes por formulario.");
  if (f.ai && profile.aiLevel !== "advanced") commercial.push("Quieres que una IA responda preguntas frecuentes y oriente a tus visitantes.");

  const automation: string[] = [];
  if (f.booking) automation.push("Necesitas que tus clientes reserven o agenden solos.");
  if (f.ai && profile.aiLevel === "advanced") automation.push("Quieres una IA que gestione y clasifique solicitudes, no solo que responda dudas.");
  if (f.automation) automation.push("Quieres automatizar procesos como cotizaciones, clasificación o seguimiento de clientes.");
  if (f.integrations) automation.push("Necesitas conectar la web con otras herramientas.");

  const ordered = tier === "premium" ? [...automation, ...commercial, ...context] : [...context, ...commercial];
  if (!ordered.length) ordered.push("Lo principal para ti es tener presencia digital clara.");
  return ordered.slice(0, 4);
}

/** Nivel de Jeipy AI que acompaña al plan, si el visitante quiere IA. */
export function pickAiTier(profile: Profile, tier: Tier): AiTierId | undefined {
  const f = profile.features;
  if (!f.ai && !profile.aiTier) return undefined;
  if (tier === "esencial-ai") return "lite";
  if (tier !== "premium") return undefined;
  if (profile.aiTier === "custom" || (f.integrations && f.automation)) return "custom";
  return "pro";
}

const WEB_COVERS: Record<Tier, string[]> = {
  basico: ["Página informativa con diseño responsive", "WhatsApp, ubicación y contacto", "Información y servicios principales del negocio"],
  esencial: ["Web completa con varias secciones", "Catálogo de productos o servicios", "Formularios, SEO básico y Analytics", "Integración con WhatsApp y optimización"],
  "esencial-ai": ["Todo lo del Esencial: web completa, catálogo, formularios, SEO básico y Analytics"],
  premium: ["Diseño y desarrollo personalizado", "Reservas, flujos e integraciones según el proyecto", "Soporte, acompañamiento y actualizaciones"],
};

const AI_COVERS: Record<AiTierId, string> = {
  lite: "Jeipy AI Lite (complemento opcional): responde preguntas frecuentes, explica tus servicios, orienta y capta datos básicos",
  pro: "Jeipy AI Pro (se contrata aparte): diagnostica necesidades, recomienda, clasifica clientes potenciales y agenda cuando aplique",
  custom: "Jeipy AI Custom (se contrata aparte): integraciones, CRM y flujos diseñados para tu operación",
};

/** Nota de costos de Jeipy AI: configuración inicial + operación mensual, sin inventar la mensualidad. */
export function aiCostNote(id: AiTierId): string {
  const tier = getAiTier(id);
  if (id === "custom") {
    return `${tier.name} va aparte del plan web: desde ${tier.setup.price} ${tier.setup.currency}, y puede aumentar según complejidad e integraciones. Ajustes y mantenimiento según alcance y contrato.`;
  }
  return `${tier.name} va aparte del plan web: configuración inicial desde ${tier.setup.price} ${tier.setup.currency} (pago único) + operación mensual según nivel de uso. ${tier.maintenance.value}.`;
}

export function recommendPlan(profile: Profile, cap?: PlanId): Recommendation {
  const tier = pickTier(profile, cap);
  const planId = tierPlan(tier);
  const business = isKnownBusiness(profile.businessType) ? `tu ${profile.businessType}` : "tu negocio";
  const pNeeds = premiumNeeds(profile);
  const eNeeds = esencialNeeds(profile);
  const aiTier = pickAiTier(profile, tier);
  const aiName = aiTier ? getAiTier(aiTier).name : "";
  let verdict: string;
  let alternative: string;

  switch (tier) {
    case "premium":
      verdict =
        profile.features.ai && profile.aiLevel === "advanced"
          ? `Aquí ya necesitas automatización más profunda, no solo atención básica. **Premium** con **${aiName}** tiene más sentido porque permite ${joinNatural(
              [profile.features.booking && "integrar reservas", "flujos personalizados", aiTier === "custom" ? "automatización diseñada para tu operación" : "un asistente comercial más completo"].filter(Boolean) as string[],
            )}.`
          : `Te recomiendo **Premium** porque necesitas ${joinNatural(pNeeds)}, algo que requiere desarrollo y flujos personalizados.${
              aiTier ? ` Para la parte de IA, **${aiName}** es el complemento indicado.` : ""
            }`;
      alternative = aiTier
        ? "Si por ahora te basta con que la IA responda dudas y capte datos, sin reservas ni procesos automatizados, Esencial + Jeipy AI Lite sería suficiente con una inversión menor."
        : "Si más adelante quieres que un asistente atienda y clasifique a tus clientes, Premium es compatible con Jeipy AI Pro. Y si no necesitas reservas ni integraciones, Esencial sería suficiente.";
      break;
    case "esencial-ai":
      verdict = `Por lo que me cuentas, **Esencial** cubre bien la parte de ${joinNatural(
        eNeeds.length ? eNeeds : ["presencia digital"],
      )}. Como también quieres automatizar preguntas frecuentes, **Jeipy AI Lite** puede añadirse como complemento sin necesidad de pasar todavía a Premium.`;
      alternative =
        cap === "esencial"
          ? "Lo que quedaría para más adelante son las reservas, integraciones y automatizaciones avanzadas de Premium."
          : "Si más adelante quieres que la IA gestione reservas, cotizaciones o clasifique clientes, ahí sí tendría sentido Premium con Jeipy AI Pro.";
      break;
    case "esencial":
      verdict = `Te recomiendo **Esencial** porque necesitas ${joinNatural(eNeeds.length ? eNeeds : ["una presencia más completa"])}.`;
      alternative =
        cap === "esencial"
          ? "Lo que quedaría para más adelante son las reservas, integraciones y automatizaciones de Premium."
          : "Si además quieres automatizar reservas o procesos más complejos, Premium sería la mejor opción. Y si quieres que una IA responda preguntas frecuentes, puedes sumar Jeipy AI Lite sin cambiar de plan.";
      break;
    default:
      verdict = `Te recomiendo **Básico**: lo que necesitas es una presencia digital clara y profesional para ${business}.`;
      alternative =
        cap === "basico"
          ? "Lo que quedaría para más adelante es el catálogo, los formularios y el SEO básico del Esencial."
          : "Si más adelante quieres catálogo, formularios o captar clientes de forma activa, Esencial sería el siguiente paso.";
  }

  const notes: string[] = [];
  let needsHuman = false;
  if (aiTier) notes.push(aiCostNote(aiTier));
  if (profile.budget && profile.budget !== "skipped") {
    const budget = profile.budget.amount;
    const entry = planPriceValue(getPlan("basico"));
    if (budget < entry) {
      needsHuman = true;
      notes.push(`Tu presupuesto (${formatCop(budget)}) está por debajo del plan de entrada (desde ${formatCop(entry)}). Lo mejor es revisarlo con el equipo.`);
    } else if (budget < planPriceValue(getPlan(planId))) {
      const fitting = [...ORDER].reverse().find((id) => planPriceValue(getPlan(id)) <= budget);
      if (fitting && fitting !== planId) {
        notes.push(`Con tu presupuesto (${formatCop(budget)}) podrías empezar con ${getPlan(fitting).name} y crecer después.`);
      }
    }
  }

  return {
    type: "recommendation",
    planId,
    aiTier,
    because: becauseList(profile, tier),
    covers: aiTier ? [...WEB_COVERS[tier], AI_COVERS[aiTier]] : WEB_COVERS[tier],
    alternative,
    notes,
    verdict,
    needsHuman,
  };
}

/** Plan inmediatamente inferior (para objeciones de precio). */
export function lowerPlan(planId: PlanId): PlanId | undefined {
  return ORDER[rank(planId) - 1];
}
