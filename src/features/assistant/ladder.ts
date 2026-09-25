/**
 * Escalera comercial de Jeipy AI: cómo bajar de nivel sin dejar de ser honesto.
 *
 *   Premium → Esencial + Jeipy AI Lite → Esencial → Básico
 *
 * Cada nivel se evalúa contra las necesidades que el visitante ya contó: qué conservaría,
 * qué quedaría por fuera y qué alternativa real existe (p. ej. reservas por formulario o
 * WhatsApp en vez de agenda automática). Nunca se promete una función que el plan no incluye.
 */
import { getAiTier, getPlan, planPriceValue } from "./knowledge";
import type { AiTierId, PlanId, Profile } from "./types";

export type Tier = "basico" | "esencial" | "esencial-ai" | "premium";

/** De menor a mayor inversión. */
export const TIER_ORDER: Tier[] = ["basico", "esencial", "esencial-ai", "premium"];
export const tierRank = (tier: Tier) => TIER_ORDER.indexOf(tier);
export const tierPlan = (tier: Tier): PlanId => (tier === "esencial-ai" ? "esencial" : tier);
export const minTier = (a: Tier, b: Tier): Tier => (tierRank(a) <= tierRank(b) ? a : b);

/** Nivel de la escalera que corresponde a un plan recomendado. */
export function tierOf(planId: PlanId, aiTier?: AiTierId): Tier {
  if (planId === "esencial" && aiTier === "lite") return "esencial-ai";
  return planId;
}

export function tierLabel(tier: Tier): string {
  return tier === "esencial-ai" ? "Esencial + Jeipy AI Lite" : getPlan(tier).name;
}

const priceValue = (price: string) => Number(price.replace(/\D/g, ""));

/** Inversión inicial del nivel (plan web + configuración de Lite en Esencial + IA). La mensualidad de IA va aparte. */
export function tierCost(tier: Tier): number {
  const web = planPriceValue(getPlan(tierPlan(tier)));
  return tier === "esencial-ai" ? web + priceValue(getAiTier("lite").setup.price) : web;
}

export function aiSetupCost(id: AiTierId): number {
  return priceValue(getAiTier(id).setup.price);
}

/** "desde $2.399.000 + Jeipy AI Lite desde $200.000" (precios leídos de src/data). */
export function tierPriceText(tier: Tier): string {
  const web = `desde ${getPlan(tierPlan(tier)).price}`;
  return tier === "esencial-ai" ? `${web} + Jeipy AI Lite desde ${getAiTier("lite").setup.price}` : web;
}

/* ---------------------------------------------------------------
   Necesidades y cobertura
   --------------------------------------------------------------- */

type Need = {
  key: string;
  /** Cómo se nombra al conservarla o perderla. */
  label: string;
  /** Primer nivel que la cubre de verdad. */
  from: Tier;
  applies: (profile: Profile) => boolean;
  /** Qué queda disponible en un nivel inferior, si algo (nunca la función completa). */
  workaround?: Partial<Record<Tier, string>>;
};

const NEEDS: Need[] = [
  {
    key: "booking",
    label: "las reservas automáticas",
    from: "premium",
    applies: (p) => Boolean(p.features.booking),
    workaround: {
      "esencial-ai": "Las citas se podrían solicitar por formulario o WhatsApp, pero sin agenda automática.",
      esencial: "Las citas se podrían solicitar por formulario o WhatsApp, pero sin agenda automática.",
      basico: "Las citas se coordinarían por WhatsApp, sin reservas desde la web.",
    },
  },
  {
    key: "automation",
    label: "las automatizaciones avanzadas",
    from: "premium",
    applies: (p) => Boolean(p.features.automation),
  },
  {
    key: "integrations",
    label: "las integraciones",
    from: "premium",
    applies: (p) => Boolean(p.features.integrations),
  },
  {
    key: "ai-advanced",
    label: "la IA avanzada de Jeipy AI Pro",
    from: "premium",
    applies: (p) => Boolean(p.features.ai) && p.aiLevel === "advanced",
    workaround: { "esencial-ai": "Jeipy AI Lite sí respondería preguntas frecuentes, orientaría y captaría datos básicos." },
  },
  {
    key: "ai-basic",
    label: "Jeipy AI Lite",
    from: "esencial-ai",
    applies: (p) => Boolean(p.features.ai) && p.aiLevel !== "advanced",
    workaround: { esencial: "Jeipy AI Lite se puede sumar más adelante sin cambiar de plan." },
  },
  {
    key: "catalog",
    label: "el catálogo de productos o servicios",
    from: "esencial",
    applies: (p) => Boolean(p.features.catalog),
    workaround: { basico: "Tus servicios principales aparecerían como información del negocio, sin catálogo con precios." },
  },
  {
    key: "clients",
    label: "la estructura comercial para captar clientes",
    from: "esencial",
    applies: (p) => p.goal === "clients" || p.goal === "sell",
  },
  {
    key: "forms",
    label: "los formularios de contacto o cotización",
    from: "esencial",
    applies: (p) => Boolean(p.features.forms),
    workaround: { basico: "Las solicitudes llegarían directamente por WhatsApp." },
  },
  {
    key: "seo",
    label: "el SEO básico para aparecer en Google",
    from: "esencial",
    applies: (p) => Boolean(p.features.seo),
  },
];

/** Lo que el nivel da siempre, para cuando ninguna necesidad concreta se conserva. */
const TIER_BASE: Record<Tier, string> = {
  basico: "presencia profesional con WhatsApp, ubicación y contacto",
  esencial: "una web completa con catálogo, formularios, SEO básico y WhatsApp",
  "esencial-ai": "una web completa con catálogo, formularios y Jeipy AI Lite respondiendo dudas",
  premium: "una solución comercial automatizada, con seguimiento de oportunidades, flujos e integraciones",
};

export type Coverage = {
  kept: string[];
  lost: string[];
  workarounds: string[];
  /** Lo que se pierde, agrupado por el nivel que lo trae ("las reservas automáticas con Premium"). */
  lostWith: string[];
};

const joinNatural = (items: string[]) =>
  items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;

function groupByTier(groups: Map<Tier, string[]>): string[] {
  return [...groups.entries()]
    .sort(([a], [b]) => tierRank(a) - tierRank(b))
    .map(([tier, labels]) => `${joinNatural(labels)} ${COMES_WITH[tier]}`);
}

const COMES_WITH: Record<Tier, string> = {
  basico: "con Básico",
  esencial: "con Esencial",
  "esencial-ai": "como complemento de Esencial",
  premium: "con Premium",
};

/** Qué conserva y qué pierde el visitante con un nivel, según lo que contó. */
export function coverage(profile: Profile, tier: Tier): Coverage {
  const kept: string[] = [];
  const lost: string[] = [];
  const workarounds: string[] = [];
  const lostByTier = new Map<Tier, string[]>();
  for (const need of NEEDS) {
    if (!need.applies(profile)) continue;
    if (tierRank(tier) >= tierRank(need.from)) kept.push(need.label);
    else {
      lost.push(need.label);
      lostByTier.set(need.from, [...(lostByTier.get(need.from) ?? []), need.label]);
      const alt = need.workaround?.[tier];
      if (alt) workarounds.push(alt);
    }
  }
  if (!kept.length) kept.push(TIER_BASE[tier]);
  return { kept, lost, workarounds, lostWith: groupByTier(lostByTier) };
}

/** Lo que el nivel superior añade sobre el inferior, de forma general. */
const TIER_ADDS: Record<Exclude<Tier, "basico">, string> = {
  esencial: "catálogo, formularios, SEO básico, Analytics y una estructura comercial más completa",
  "esencial-ai": "Jeipy AI Lite, que responde dudas, orienta y capta datos",
  premium: "automatización, captación y seguimiento de oportunidades, flujos comerciales, integraciones y funciones a medida",
};

export function tierAdds(profile: Profile, lower: Tier, upper: Tier): string[] {
  return relevantTiers(profile)
    .filter((t) => tierRank(t) > tierRank(lower) && tierRank(t) <= tierRank(upper))
    .map((t) => TIER_ADDS[t as Exclude<Tier, "basico">]);
}

/* ---------------------------------------------------------------
   Escalera y presupuesto
   --------------------------------------------------------------- */

/** Niveles que tienen sentido para este visitante (Esencial + Lite solo si quiere IA). */
function relevantTiers(profile: Profile): Tier[] {
  return TIER_ORDER.filter((t) => t !== "esencial-ai" || Boolean(profile.features.ai));
}

/** Siguiente peldaño hacia abajo, o nada si ya está en el plan de entrada. */
export function nextLowerTier(profile: Profile, from: Tier): Tier | undefined {
  return relevantTiers(profile)
    .filter((t) => tierRank(t) < tierRank(from))
    .pop();
}

/** Nivel más alto (sin pasar del ideal) que entra en el presupuesto, o nada si ninguno alcanza. */
export function affordableTier(profile: Profile, budget: number, ideal: Tier): Tier | undefined {
  return relevantTiers(profile)
    .filter((t) => tierRank(t) <= tierRank(ideal) && tierCost(t) <= budget)
    .pop();
}

export function budgetAmount(profile: Profile): number | undefined {
  return profile.budget && profile.budget !== "skipped" ? profile.budget.amount : undefined;
}

