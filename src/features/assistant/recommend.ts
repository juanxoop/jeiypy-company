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
 *
 * Presupuesto: si el visitante dio una cifra, se recomienda el nivel más alto que entra en ella
 * (ver `ladder.ts`) y se explica con honestidad qué queda para una segunda etapa.
 */
import {
  affordableTier,
  aiSetupCost,
  budgetAmount,
  coverage,
  minTier,
  plural,
  tierCost,
  tierLabel,
  tierPlan,
  tierRank,
  type Tier,
} from "./ladder";
import { formatCop, getAiTier, getPlan } from "./knowledge";
import { businessRef } from "./nlu";
import { CHANNEL_LABEL } from "@/features/leads/labels";
import type { AiTierId, MessageBlock, Profile } from "./types";

export type { Tier } from "./ladder";

type Recommendation = Extract<MessageBlock, { type: "recommendation" }> & {
  /** Frase principal que resume la recomendación. */
  verdict: string;
  /** El caso necesita revisión humana (p. ej. presupuesto por debajo del plan de entrada). */
  needsHuman: boolean;
  /** Nivel recomendado y nivel ideal sin límites de presupuesto (si difieren, hubo ajuste). */
  tier: Tier;
  ideal: Tier;
};

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

/** Nivel ideal según las necesidades, opcionalmente limitado a un nivel máximo (objeción aceptada). */
export function pickTier(profile: Profile, cap?: Tier): Tier {
  const wantsAi = Boolean(profile.features.ai);
  let tier: Tier;
  if (premiumNeeds(profile).length > 0) tier = "premium";
  else if (wantsAi) tier = "esencial-ai"; // Jeipy AI se suma desde Esencial.
  else if (esencialNeeds(profile).length > 0) tier = "esencial";
  else tier = "basico";

  if (cap) tier = minTier(tier, cap);
  if (tier === "esencial-ai" && !wantsAi) tier = "esencial";
  return tier;
}

/**
 * Respuestas del visitante que sostienen la recomendación, con sus palabras.
 * Primero van las que justifican el plan elegido (en Premium, las de automatización).
 */
function becauseList(profile: Profile, tier: Tier): string[] {
  const f = profile.features;
  const context: string[] = [];
  const channels = (profile.channels ?? []).filter((c) => c !== "website" && c !== "none").map((c) => CHANNEL_LABEL[c]);
  if (profile.websiteStatus === "none") {
    context.push(channels.length ? `Hoy trabajas con ${joinNatural(channels)}, sin una web propia.` : "Aún no tienes presencia digital.");
  }
  if (profile.websiteStatus === "outdated") context.push("Ya tienes página, pero está desactualizada: no partimos de cero, la renovamos.");
  if (profile.websiteStatus === "needs_improvement") context.push("Ya tienes página, pero necesita mejoras para traerte clientes.");
  if (profile.websiteStatus === "existing") context.push("Ya tienes página: la llevamos a una base más sólida.");
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
  basico: ["Web profesional con diseño responsive", "Contacto, WhatsApp y ubicación", "Información y servicios principales del negocio"],
  esencial: ["Web comercial orientada a captación", "Catálogo de productos o servicios", "Formularios, SEO básico y Analytics", "Estructura para captar oportunidades"],
  "esencial-ai": ["Todo lo del Esencial: web completa, catálogo, formularios, SEO básico y Analytics"],
  premium: [
    "Solución digital comercial y automatizada, a la medida",
    "Captación y seguimiento de oportunidades, flujos comerciales y reservas según el proyecto",
    "Integraciones, funciones personalizadas y CRM/seguimiento cuando aplique",
    "Soporte y acompañamiento",
  ],
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

export function recommendPlan(profile: Profile, cap?: Tier): Recommendation {
  const ideal = pickTier(profile);
  const budget = budgetAmount(profile);
  let tier = pickTier(profile, cap);
  let budgetGap = false;
  if (budget !== undefined) {
    const fit = affordableTier(profile, budget, tier);
    if (fit) tier = fit;
    else {
      budgetGap = true;
      tier = "basico";
    }
  }
  const planId = tierPlan(tier);
  const downgraded = tierRank(tier) < tierRank(ideal);
  const business = businessRef(profile.businessType);
  const pNeeds = premiumNeeds(profile);
  const eNeeds = esencialNeeds(profile);

  // La IA de Premium se suma aparte: si el presupuesto no la cubre, queda para una segunda etapa.
  let aiTier = pickAiTier(profile, tier);
  let deferredAi: AiTierId | undefined;
  if (aiTier && tier === "premium" && budget !== undefined && budget < tierCost("premium") + aiSetupCost(aiTier)) {
    deferredAi = aiTier;
    aiTier = undefined;
  }
  const aiName = aiTier ? getAiTier(aiTier).name : "";
  const notes: string[] = [];
  let verdict: string;
  let alternative: string;

  if (budgetGap) {
    verdict = `Te soy transparente: con ${formatCop(budget!)} todavía no alcanza ningún plan estándar. El de entrada es **Básico**, desde ${getPlan("basico").price}, y es la opción más cercana para ${business}.`;
    alternative = "Se puede ajustar reduciendo el alcance, haciendo el proyecto por etapas o con una propuesta personalizada del equipo.";
  } else if (downgraded) {
    const cov = coverage(profile, tier);
    const reason = budget !== undefined ? `dentro de tu presupuesto (${formatCop(budget)})` : "con una inversión menor";
    verdict = `Para empezar ${reason}, te recomiendo **${tierLabel(tier)}**. Mantendrías ${joinNatural(cov.kept)}${
      cov.lost.length ? `, y ${joinNatural(cov.lost)} ${plural(cov.lost) ? "quedarían" : "quedaría"} para una segunda etapa` : ""
    }.`;
    alternative = cov.lostWith.length
      ? `Cuando quieras crecer, puedes sumar ${joinNatural(cov.lostWith)}.`
      : `Cuando quieras crecer, ${tierLabel(ideal)} suma las funciones más avanzadas.`;
    notes.push(...cov.workarounds);
  } else {
    switch (tier) {
      case "premium":
        verdict =
          profile.features.ai && profile.aiLevel === "advanced" && aiTier
            ? `Aquí ya necesitas automatización más profunda, no solo atención básica. **Premium** con **${aiName}** tiene más sentido porque permite ${joinNatural(
                [profile.features.booking && "integrar reservas", "flujos personalizados", aiTier === "custom" ? "automatización diseñada para tu operación" : "un asistente comercial más completo"].filter(Boolean) as string[],
              )}.`
            : `Te recomiendo **Premium** porque necesitas ${joinNatural(pNeeds)}, algo que requiere desarrollo y flujos personalizados.${
                aiTier ? ` Para la parte de IA, **${aiName}** es el complemento indicado.` : ""
              }`;
        alternative = profile.features.ai
          ? "Si por ahora te basta con que la IA responda dudas y capte datos, sin reservas ni procesos automatizados, Esencial + Jeipy AI Lite sería suficiente con una inversión menor."
          : "Si más adelante quieres que un asistente atienda y clasifique a tus clientes, Premium es compatible con Jeipy AI Pro. Y si no necesitas reservas ni integraciones, Esencial sería suficiente.";
        break;
      case "esencial-ai":
        verdict = `Por lo que me cuentas, **Esencial** cubre bien la parte de ${joinNatural(
          eNeeds.length ? eNeeds : ["presencia digital"],
        )}. Como también quieres automatizar preguntas frecuentes, **Jeipy AI Lite** puede añadirse como complemento sin necesidad de pasar todavía a Premium.`;
        alternative = "Si más adelante quieres que la IA gestione reservas, cotizaciones o clasifique clientes, ahí sí tendría sentido Premium con Jeipy AI Pro.";
        break;
      case "esencial":
        verdict = `Te recomiendo **Esencial** porque necesitas ${joinNatural(eNeeds.length ? eNeeds : ["una presencia más completa"])}.`;
        alternative =
          "Si además quieres automatizar reservas o procesos más complejos, Premium sería la mejor opción. Y si quieres que una IA responda preguntas frecuentes, puedes sumar Jeipy AI Lite sin cambiar de plan.";
        break;
      default:
        verdict = `Te recomiendo **Básico**: lo que necesitas es una presencia digital clara y profesional para ${business}.`;
        alternative = "Si más adelante quieres catálogo, formularios o captar clientes de forma activa, Esencial sería el siguiente paso.";
    }
  }

  if (aiTier) notes.push(aiCostNote(aiTier));
  if (deferredAi) {
    const deferred = getAiTier(deferredAi);
    notes.push(`Con tu presupuesto, ${deferred.name} (configuración desde ${deferred.setup.price}) puede sumarse en una segunda etapa.`);
  }
  if (budget !== undefined && !budgetGap && !downgraded) {
    notes.push(`Entra en tu presupuesto de ${formatCop(budget)}${aiTier ? "; la operación mensual de Jeipy AI va aparte" : ""}.`);
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
    needsHuman: budgetGap,
    tier,
    ideal,
  };
}
