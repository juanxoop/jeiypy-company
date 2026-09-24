/**
 * Oferta de Jeipy AI: una capa de inteligencia que se suma al plan web.
 * El plan web construye la presencia digital; Jeipy AI añade atención y automatización.
 *
 * Precios de configuración: pago único. La operación mensual todavía no tiene valores
 * publicados: se define según el nivel de uso y el servicio contratado.
 */
import type { Plan } from "./plans";

export type JeipyAiTierId = "lite" | "pro" | "custom";

export type JeipyAiTier = {
  id: JeipyAiTierId;
  name: string;
  audience: string;
  features: string[];
  setup: { label: string; price: string; currency: string; note?: string };
  /** Operación mensual: sin valores publicados, depende del uso y del alcance. */
  operation: string;
  maintenance: { label: string; value: string };
  /** Plan web con el que se combina. */
  pairsWith: string;
  pairsWithPlan?: Plan["id"];
  cta: { label: string; message: string };
  featured?: boolean;
};

export const jeipyAiOffer = {
  eyebrow: "Jeipy AI",
  title: "Potencia tu página con Jeipy AI",
  intro: "Convierte tu sitio en un asistente inteligente que responde, orienta y ayuda a transformar visitantes en clientes.",
  layers: [
    { label: "Tu plan web", text: "Construye tu presencia digital" },
    { label: "Jeipy AI", text: "Le suma inteligencia y automatización" },
  ],
  benefits: [
    "Responde a tus clientes incluso cuando no estás disponible",
    "Reduce las preguntas repetitivas",
    "Orienta mejor a cada visitante",
    "Capta oportunidades de venta",
    "Automatiza tareas del día a día",
    "Convierte tu web en una herramienta comercial activa",
  ],
  pricing: {
    setup: {
      title: "Configuración inicial",
      text: "Pago único por diseñar, configurar, probar e integrar Jeipy AI en tu página.",
    },
    operation: {
      title: "Operación mensual",
      text: "Cubre el uso de la IA, mantenimiento, actualizaciones, soporte y optimización. Su valor depende del nivel de uso y del servicio contratado.",
    },
  },
  monthlyLabel: "Mensualidad según nivel de uso",
} as const;

export const jeipyAiTiers: JeipyAiTier[] = [
  {
    id: "lite",
    name: "Jeipy AI Lite",
    audience: "Ideal para pequeños negocios que quieren automatizar la atención básica sin complicaciones.",
    features: [
      "Responde preguntas frecuentes",
      "Explica tus productos o servicios",
      "Orienta a los visitantes",
      "Capta datos básicos de posibles clientes",
      "Mantiene el contexto de la conversación",
    ],
    setup: { label: "Configuración inicial", price: "$200.000", currency: "COP" },
    operation: "Mensualidad según nivel de uso",
    maintenance: { label: "Ajustes", value: "Incluye hasta 2 ajustes mensuales" },
    pairsWith: "Se suma al plan Esencial",
    pairsWithPlan: "esencial",
    cta: { label: "Agregar Jeipy AI", message: "Quiero agregar Jeipy AI Lite a mi página" },
  },
  {
    id: "pro",
    name: "Jeipy AI Pro",
    audience: "Para negocios que quieren convertir el asistente en una herramienta comercial más completa.",
    features: [
      "Todo lo de Lite",
      "Diagnóstico de necesidades",
      "Recomendación de productos o servicios",
      "Captación y clasificación de clientes potenciales",
      "Reservas o agendamiento cuando aplique",
      "Flujos comerciales más avanzados",
      "Integraciones compatibles según el proyecto",
    ],
    setup: { label: "Configuración inicial", price: "$350.000", currency: "COP" },
    operation: "Mensualidad según nivel de uso",
    maintenance: { label: "Ajustes", value: "Incluye de 3 a 4 ajustes mensuales" },
    pairsWith: "Pensado para el plan Premium",
    pairsWithPlan: "premium",
    cta: { label: "Quiero automatizar mi negocio", message: "Quiero automatizar mi negocio con Jeipy AI Pro" },
    featured: true,
  },
  {
    id: "custom",
    name: "Jeipy AI Custom",
    audience: "Para empresas o proyectos que necesitan automatización diseñada para su operación.",
    features: [
      "Integraciones personalizadas y CRM",
      "Múltiples flujos y automatización de procesos",
      "Reservas complejas y cotizaciones",
      "Clasificación avanzada de clientes potenciales",
      "Conexión con herramientas externas",
      "Soluciones a medida según la necesidad",
    ],
    setup: {
      label: "Precio",
      price: "$479.900",
      currency: "COP",
      note: "Puede aumentar según la complejidad, las integraciones y los requerimientos.",
    },
    operation: "Mensualidad según alcance",
    maintenance: { label: "Ajustes y mantenimiento", value: "Según alcance y contrato" },
    pairsWith: "Para proyectos especiales",
    cta: { label: "Consultar solución", message: "Quiero consultar una solución de Jeipy AI Custom" },
  },
];

export function getAiTier(id: JeipyAiTierId): JeipyAiTier {
  const tier = jeipyAiTiers.find((t) => t.id === id);
  if (!tier) throw new Error(`Nivel de Jeipy AI desconocido: ${id}`);
  return tier;
}
