/**
 * Etiquetas legibles del perfil comercial. Las comparten el asistente (resumen que ve el cliente)
 * y el backend (reporte que recibe el equipo), para que ambos hablen igual.
 */
import type { DigitalChannel, Feature, Goal, WebsiteStatus } from "@/features/assistant/types";

export const WEBSITE_LABEL: Record<WebsiteStatus, string> = {
  none: "Sin página web",
  existing: "Ya tiene página web",
  outdated: "Tiene página, pero desactualizada",
  needs_improvement: "Tiene página, pero necesita mejoras",
};

export const CHANNEL_LABEL: Record<DigitalChannel, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  google_business: "Google Maps / Perfil de Google",
  website: "Página web",
  ecommerce: "Tienda online / marketplace",
  other: "Otras redes",
  none: "Ninguno",
};

/** "WhatsApp, Instagram · Sin página web". */
export function presenceLabel(channels: DigitalChannel[] = [], websiteStatus?: WebsiteStatus): string | undefined {
  const named = channels.filter((c) => c !== "website" && c !== "none").map((c) => CHANNEL_LABEL[c]);
  const parts = [named.join(", "), websiteStatus ? WEBSITE_LABEL[websiteStatus] : undefined].filter(Boolean);
  if (!parts.length) return channels.includes("none") ? "Sin presencia digital" : undefined;
  return parts.join(" · ");
}

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
