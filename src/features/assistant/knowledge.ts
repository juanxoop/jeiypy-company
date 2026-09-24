/**
 * Base de conocimiento de Jeipy AI.
 * Se construye a partir de los mismos datos que muestra la web: si cambia un precio
 * o un servicio en `src/data`, el asistente lo sabe automáticamente.
 * Todo lo que no esté aquí, el asistente debe reconocer que no lo sabe.
 */
import { siteConfig } from "@/config/site";
import { getAiTier, jeipyAiOffer, jeipyAiTiers } from "@/data/jeipyAi";
import { jeipyAi, plans, type Plan } from "@/data/plans";
import { processSteps } from "@/data/process";
import { services } from "@/data/services";
import { pricingContent } from "@/data/home";
import type { AiTierId, PlanId } from "./types";

export { getAiTier };

export const company = {
  name: siteConfig.name,
  slogan: siteConfig.slogan,
  country: siteConfig.country,
  pitch:
    "Somos un estudio digital que ayuda a pequeños negocios, emprendedores y microempresas a entrar al mundo digital con páginas web profesionales. La idea es simple: que un negocio pequeño se vea digitalmente como una gran empresa.",
} as const;

export const knowledge = {
  company,
  services,
  plans,
  process: processSteps,
  jeipyAi,
  aiOffer: jeipyAiOffer,
  aiTiers: jeipyAiTiers,
  priceNote: pricingContent.notes[0],
} as const;

export function getPlan(id: PlanId): Plan {
  const plan = plans.find((p) => p.id === id);
  if (!plan) throw new Error(`Plan desconocido: ${id}`);
  return plan;
}

/** "$1.000.000" → 1000000 */
export function planPriceValue(plan: Plan): number {
  return Number(plan.price.replace(/\D/g, ""));
}

export function formatCop(amount: number): string {
  return `$${amount.toLocaleString("es-CO")} COP`;
}

/** Cómo se relaciona cada plan con Jeipy AI, en una frase. La IA nunca va incluida en el precio del plan. */
export function aiAvailability(plan: Plan): string {
  switch (plan.ai.mode) {
    case "none":
      return "no incluye Jeipy AI: es ideal para comenzar tu presencia digital";
    case "addon":
      return `es compatible con ${aiTierPriceLine("lite")}, como complemento opcional`;
    case "featured":
      return `es compatible con ${aiTierPriceLine("pro")}, que se contrata aparte`;
  }
}

/** "Jeipy AI Lite (configuración inicial desde $200.000, pago único, + operación mensual según uso)". */
export function aiTierPriceLine(id: AiTierId): string {
  const tier = getAiTier(id);
  return id === "custom"
    ? `${tier.name} (desde ${tier.setup.price}, según alcance)`
    : `${tier.name} (configuración inicial desde ${tier.setup.price}, pago único, + operación mensual según uso)`;
}

/**
 * Temas sobre los que todavía no hay información configurada.
 * El asistente los reconoce para responder con honestidad en lugar de improvisar.
 */
export const unknownTopics = {
  timeline: "los tiempos de entrega",
  payment: "las formas de pago",
  hosting: "el dominio y el hosting",
  ecommerce: "las tiendas online con pagos en línea",
} as const;

export type UnknownTopic = keyof typeof unknownTopics;
