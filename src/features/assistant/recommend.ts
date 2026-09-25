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
 * adecuada, no la más cara, y la presenta como tarjeta: plan · por qué · lo más importante ·
 * situación actual · qué cambiaría la elección. La tarjeta sustituye la explicación larga.
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
  tierCost,
  tierLabel,
  tierPlan,
  tierRank,
  type Tier,
} from "./ladder";
import { formatCop, getAiTier } from "./knowledge";
import { businessKind, businessRef } from "./nlu";
import { CHANNEL_LABEL, GOAL_LABEL } from "@/features/leads/labels";
import type { AiTierId, Profile, RecommendationBlock } from "./types";

export type { Tier } from "./ladder";

type Recommendation = RecommendationBlock & {
  /** Frase corta que presenta la tarjeta (la explicación completa va dentro de ella). */
  intro: string;
  /** "Por qué": siempre presente en la recomendación. */
  because: string[];
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

const cap = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/** Cómo se nombra lo que el negocio ofrece: menú, productos o servicios. */
function offerNoun(profile: Profile): string {
  const kind = businessKind(profile);
  return kind === "food" ? "tu menú" : kind === "retail" ? "tus productos" : "tus servicios";
}

/**
 * "Por qué te lo recomiendo": respuestas del visitante, en frases cortas y con sus palabras.
 * Primero van las que justifican el plan elegido (en Premium, las de automatización).
 * Solo se usa lo que contó y que el nivel cubre de verdad: lo que queda para después va en "segunda etapa".
 */
export function becauseList(profile: Profile, tier: Tier): string[] {
  const f = profile.features;
  const covers = (from: Tier) => tierRank(tier) >= tierRank(from);
  const context: string[] = [];
  if (profile.websiteStatus === "none") context.push("Aún no tienes una web propia");
  if (profile.websiteStatus === "outdated") context.push("Tu web actual está desactualizada");
  if (profile.websiteStatus === "needs_improvement") context.push("Tu web actual necesita mejoras");
  if (profile.goal === "image") context.push("Buscas una imagen más profesional");
  if (profile.goal === "showcase" && !(f.catalog && covers("esencial"))) context.push(`Quieres mostrar ${offerNoun(profile)}`);

  const commercial: string[] = [];
  if (f.catalog && covers("esencial")) commercial.push(`Quieres mostrar ${offerNoun(profile)} con precios`);
  if (profile.goal === "clients") commercial.push("Quieres conseguir más clientes");
  if (profile.goal === "sell") commercial.push("Quieres vender más");
  if (f.forms && covers("esencial")) commercial.push("Quieres recibir solicitudes por formulario");
  if (f.seo && covers("esencial")) commercial.push("Quieres aparecer en Google");
  if (f.ai && profile.aiLevel !== "advanced" && covers("esencial-ai")) commercial.push("Quieres que una IA responda preguntas frecuentes");

  const automation: string[] = [];
  if (f.booking) automation.push("Necesitas que tus clientes reserven o agenden solos");
  if (f.ai && profile.aiLevel === "advanced") automation.push("Quieres una IA que gestione y clasifique solicitudes");
  if (f.automation) automation.push("Quieres automatizar la atención y el seguimiento");
  if (f.integrations) automation.push("Necesitas conectar la web con tus herramientas");

  const ordered = tier === "premium" ? [...automation, ...commercial, ...context] : [...commercial, ...context];
  if (!ordered.length) ordered.push("Lo principal es tener una presencia digital clara");
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

type Highlight = NonNullable<RecommendationBlock["highlights"]>[number];

/**
 * "Lo más importante para tu negocio": primero lo que resuelve de lo que pidió, luego lo que el
 * plan trae siempre. Nunca aparece una función que el plan no incluye.
 */
function highlights(profile: Profile, tier: Tier, aiTier?: AiTierId): Highlight[] {
  const f = profile.features;
  const wantsClients = profile.goal === "clients" || profile.goal === "sell";
  const list: (Highlight | false | undefined)[] =
    tier === "premium"
      ? [
          f.booking && { icon: "booking", label: "Reservas y agenda automática" },
          f.automation && { icon: "automation", label: "Automatización de procesos" },
          aiTier && { icon: "ai", label: `${getAiTier(aiTier).name} (aparte)` },
          { icon: "capture", label: "Captación de oportunidades" },
          { icon: "followup", label: "Seguimiento de clientes" },
          { icon: "integration", label: f.integrations ? "Integraciones con tus herramientas" : "Integraciones según el proyecto" },
          { icon: "gear", label: "Funciones a la medida" },
        ]
      : tier === "basico"
        ? [
            { icon: "presence", label: "Web profesional y responsive" },
            { icon: "whatsapp", label: "Contacto directo por WhatsApp" },
            { icon: "location", label: "Ubicación y datos del negocio" },
            { icon: "catalog", label: "Tus servicios principales" },
          ]
        : [
            f.catalog && { icon: "catalog", label: "Catálogo organizado" },
            tier === "esencial-ai" && { icon: "ai", label: "Jeipy AI Lite (opcional)" },
            (wantsClients || f.forms) && { icon: "form", label: "Formularios y captación de contactos" },
            { icon: "whatsapp", label: "Integración con WhatsApp" },
            { icon: "search", label: "SEO básico" },
            { icon: "analytics", label: "Analytics" },
            !f.catalog && { icon: "catalog", label: "Catálogo de productos o servicios" },
            !(wantsClients || f.forms) && { icon: "form", label: "Formularios de contacto" },
          ];
  return list.filter((h): h is Highlight => Boolean(h)).slice(0, 5);
}

const WEBSITE_SHORT: Record<NonNullable<Profile["websiteStatus"]>, string> = {
  none: "No",
  existing: "Sí",
  outdated: "Sí, desactualizada",
  needs_improvement: "Sí, necesita mejoras",
};

/** "Tu situación actual": solo lo que el visitante contó en la conversación. */
export function situationRows(profile: Profile): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  const business = profile.businessName
    ? `${profile.businessName}${profile.businessType ? ` (${profile.businessType})` : ""}`
    : profile.businessType && cap(profile.businessType);
  if (business) rows.push({ label: "Negocio", value: business });
  const channels = (profile.channels ?? []).filter((c) => c !== "website" && c !== "none").map((c) => CHANNEL_LABEL[c]);
  if (channels.length) rows.push({ label: "Presencia", value: channels.join(" + ") });
  else if (profile.channels?.includes("none")) rows.push({ label: "Presencia", value: "Sin canales digitales" });
  if (profile.websiteStatus) rows.push({ label: "Web", value: WEBSITE_SHORT[profile.websiteStatus] });
  if (profile.goal) rows.push({ label: "Objetivo", value: cap(GOAL_LABEL[profile.goal].toLowerCase()) });
  // El presupuesto no se repite aquí: la tarjeta ya dice cómo encaja con él.
  return rows;
}

/** Frase de valor de cada nivel: lo que el cliente compra, no "una página más cara". */
const TAGLINE: Record<Tier, string> = {
  basico: "La forma más directa de que tu negocio se vea profesional y sea fácil de contactar.",
  esencial: "La opción que mejor equilibra captación, presencia profesional y crecimiento.",
  "esencial-ai": "Una web que capta clientes, con una IA que responde las dudas frecuentes por ti.",
  premium: "No es una web más grande: es una solución que capta, da seguimiento y automatiza tu operación comercial.",
};

/** Por qué un nivel más económico puede ser una buena forma de empezar (sin descuentos inventados). */
const WHY_START: Record<Tier, string> = {
  basico: "Tendrías presencia profesional desde ya y puedes crecer por etapas cuando el negocio lo pida.",
  esencial: "Conservas la parte comercial que más impacto tiene y sumas lo avanzado cuando lo necesites.",
  "esencial-ai": "Conservas la web comercial y la IA para dudas frecuentes; la automatización profunda puede venir después.",
  premium: TAGLINE.premium,
};

/** Nota de costos de Jeipy AI: configuración inicial + operación mensual, sin inventar la mensualidad. */
export function aiCostNote(id: AiTierId): string {
  const tier = getAiTier(id);
  if (id === "custom") {
    return `${tier.name} va aparte del plan web: desde ${tier.setup.price} ${tier.setup.currency}, y puede aumentar según complejidad e integraciones. Ajustes y mantenimiento según alcance y contrato.`;
  }
  return `${tier.name} va aparte del plan web: configuración inicial desde ${tier.setup.price} ${tier.setup.currency} (pago único) + operación mensual según nivel de uso. ${tier.maintenance.value}.`;
}

const firstUpper = (items: string[]) => items.map(cap);

export function recommendPlan(profile: Profile, capTier?: Tier): Recommendation {
  const ideal = pickTier(profile);
  const budget = budgetAmount(profile);
  let tier = pickTier(profile, capTier);
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

  // La IA de Premium se suma aparte: si el presupuesto no la cubre, queda para una segunda etapa.
  let aiTier = pickAiTier(profile, tier);
  let deferredAi: AiTierId | undefined;
  if (aiTier && tier === "premium" && budget !== undefined && budget < tierCost("premium") + aiSetupCost(aiTier)) {
    deferredAi = aiTier;
    aiTier = undefined;
  }
  const notes: string[] = [];
  let intro: string;
  let title = "Plan recomendado";
  let alternative: string | undefined;
  let keeps: string[] | undefined;
  let later: string[] | undefined;
  let meanwhile: string[] | undefined;

  if (budgetGap) {
    intro = `Te soy transparente: con ${formatCop(budget!)} todavía no alcanza ningún plan estándar. La opción más cercana para ${business} es nuestro plan de entrada:`;
    title = "Plan de entrada";
    // Las formas de ajustar la inversión se listan justo después de la tarjeta: no se repiten aquí.
  } else if (downgraded) {
    const cov = coverage(profile, tier);
    intro =
      budget !== undefined
        ? `Para empezar dentro de tu presupuesto (${formatCop(budget)}), esta es la opción que más sentido tiene:`
        : "Para empezar con una inversión menor, esta es la opción que más sentido tiene:";
    title = "Recomendado para empezar";
    keeps = firstUpper(cov.kept);
    later = cov.lost.length ? firstUpper(cov.lost) : undefined;
    meanwhile = cov.workarounds.length ? cov.workarounds : undefined;
    alternative = cov.lostWith.length
      ? `Cuando quieras crecer, puedes sumar ${joinNatural(cov.lostWith)}.`
      : `Cuando quieras crecer, ${tierLabel(ideal)} suma las funciones más avanzadas.`;
  } else {
    intro =
      tier === "premium" && profile.features.ai && profile.aiLevel === "advanced"
        ? "Aquí ya necesitas automatización más profunda, no solo atención básica. Esta es mi recomendación:"
        : `Con lo que me contaste de ${business}, esta es la opción que más sentido tiene:`;
    switch (tier) {
      case "premium":
        alternative = profile.features.ai
          ? "Si por ahora te basta con que la IA responda dudas y capte datos, sin reservas ni procesos automatizados, Esencial + Jeipy AI Lite sería suficiente con una inversión menor."
          : "Si no necesitas reservas, automatizaciones ni integraciones, Esencial sería suficiente. Y si más adelante quieres un asistente que atienda y clasifique clientes, Premium es compatible con Jeipy AI Pro.";
        break;
      case "esencial-ai":
        alternative = "Si más adelante quieres que la IA gestione reservas, cotizaciones o clasifique clientes, ahí sí tendría sentido Premium con Jeipy AI Pro.";
        break;
      case "esencial":
        alternative =
          "Si además quieres automatizar reservas o procesos más complejos, Premium sería la mejor opción. Y si quieres que una IA responda preguntas frecuentes, puedes sumar Jeipy AI Lite sin cambiar de plan.";
        break;
      default:
        alternative = "Si más adelante quieres catálogo, formularios o captar clientes de forma activa, Esencial sería el siguiente paso.";
    }
  }

  // El costo de la IA va en el encabezado de la tarjeta (configuración + mensualidad): no se repite en notas.
  if (deferredAi) {
    const deferred = getAiTier(deferredAi);
    notes.push(`Con tu presupuesto, ${deferred.name} (configuración desde ${deferred.setup.price}) puede sumarse en una segunda etapa.`);
  }
  const budgetInfo: RecommendationBlock["budget"] =
    budget === undefined || budgetGap
      ? undefined
      : downgraded
        ? { fits: true, text: `Ajustado a tu presupuesto de ${formatCop(budget)}` }
        : { fits: true, text: `Entra en tu presupuesto de ${formatCop(budget)}${aiTier ? " (la mensualidad de Jeipy AI va aparte)" : ""}` };

  const situation = situationRows(profile);
  return {
    type: "recommendation",
    variant: "recommended",
    planId,
    aiTier,
    title,
    tagline: TAGLINE[tier],
    because: becauseList(profile, tier),
    highlights: highlights(profile, tier, aiTier),
    situation: situation.length ? situation : undefined,
    keeps,
    later,
    meanwhile,
    budget: budgetInfo,
    notes: notes.length ? notes : undefined,
    alternative,
    intro,
    needsHuman: budgetGap,
    tier,
    ideal,
  };
}

/**
 * Tarjeta de la alternativa más económica tras una objeción: qué conserva, qué deja para una
 * segunda etapa y por qué puede ser buena forma de empezar. Nunca inventa descuentos.
 */
export function alternativeCard(profile: Profile, lower: Tier): RecommendationBlock {
  const cov = coverage(profile, lower);
  const budget = budgetAmount(profile);
  return {
    type: "recommendation",
    variant: "alternative",
    planId: tierPlan(lower),
    aiTier: lower === "esencial-ai" ? "lite" : undefined,
    title: "Alternativa para reducir inversión",
    tagline: WHY_START[lower],
    keeps: firstUpper(cov.kept),
    later: cov.lost.length ? firstUpper(cov.lost) : undefined,
    meanwhile: cov.workarounds.length ? cov.workarounds : undefined,
    budget:
      budget === undefined
        ? undefined
        : tierCost(lower) <= budget
          ? { fits: true, text: `Entra en tu presupuesto de ${formatCop(budget)}` }
          : { fits: false, text: `Aun así, estaría por encima de tu presupuesto de ${formatCop(budget)}` },
  };
}
