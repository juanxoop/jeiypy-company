/**
 * Etiquetas legibles del perfil comercial. Las comparten el asistente (resumen que ve el cliente)
 * y el backend (reporte que recibe el equipo), para que ambos hablen igual.
 */
import type { Feature, Goal, WebsiteStatus } from "@/features/assistant/types";

export const WEBSITE_LABEL: Record<WebsiteStatus, string> = {
  yes: "Ya tiene web",
  no: "Aún no tiene web",
  social: "Solo redes y WhatsApp",
};

export const GOAL_LABEL: Record<Goal, string> = {
  clients: "Conseguir más clientes",
  image: "Imagen más profesional",
  showcase: "Mostrar productos o servicios",
  sell: "Vender más",
  automate: "Automatizar la atención",
};

export const FEATURE_LABEL: Record<Feature, string> = {
  catalog: "catálogo",
  booking: "reservas",
  forms: "formularios",
  ai: "automatización con IA",
  integrations: "integraciones",
  seo: "SEO",
  automation: "automatización de procesos",
};

/** Necesidades detectadas, en el orden en que importan comercialmente. */
export function needsLabels(goal: Goal | undefined, features: Feature[]): string[] {
  const needs = features.filter((f) => f !== "ai").map((f) => FEATURE_LABEL[f]);
  if (goal === "clients" || goal === "sell") needs.push("captación de clientes");
  return needs;
}
