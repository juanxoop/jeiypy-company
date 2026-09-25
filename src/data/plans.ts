import type { FeatureIconName } from "@/components/icons/FeatureIcon";

/**
 * Planes comerciales: única fuente de precios para la web, Jeipy AI, recomendaciones y resúmenes.
 * Precios "desde": el valor final depende del alcance de cada proyecto.
 */

/** Cómo se relaciona cada plan con Jeipy AI. */
export type PlanAi =
  | { mode: "none"; note: string }
  | { mode: "addon"; tag: string; tier: string; description: string; note: string }
  | {
      mode: "featured";
      tag: string;
      tier: string;
      /** Capacidades agrupadas por el resultado de negocio que producen. */
      groups: { label: string; items: string[] }[];
      note: string;
    };

export type PlanCtaIntent = "start" | "choose" | "talk";

/** Punto visual de la tarjeta (icono + texto corto). */
export type PlanPoint = { icon: FeatureIconName; label: string };

export type Plan = {
  id: "basico" | "esencial" | "premium";
  name: string;
  /** Promesa del plan en una línea (lo que el cliente compra, no "una página más cara"). */
  positioning: string;
  /** Enfoque que diferencia al plan de un vistazo (presencia, captación, automatización). */
  focus: { label: string; icon: FeatureIconName };
  /** Aclaración breve bajo la promesa, solo cuando hace falta (Premium). */
  positioningNote?: string;
  /** Cómo trabaja el plan, en pasos cortos. `flow`: se recorren en orden; `set`: conviven. */
  signature: { kind: "set" | "flow" | "loop"; steps: string[] };
  /** Perfiles a los que mejor sirve (chips cortos). */
  idealFor: string[];
  price: string;
  currency: string;
  /** Resumen en una frase: lo usa Jeipy AI al explicar el plan. */
  summary: string;
  /** Lo que incluye. La tarjeta muestra los primeros `FEATURES_VISIBLE` y el resto al expandir. */
  features: string[];
  /** Resultado comercial esperado (2–3 beneficios). */
  outcomes: PlanPoint[];
  ai: PlanAi;
  cta: { label: string; intent: PlanCtaIntent; message: string };
  highlight?: string;
};

export const jeipyAi = {
  name: "Jeipy AI",
  tagline: "Asistente inteligente para tu negocio",
  costNote:
    "Jeipy AI se contrata aparte del plan web: una configuración inicial de pago único y una operación mensual según el nivel de uso.",
} as const;

export const plans: Plan[] = [
  {
    id: "basico",
    name: "Básico",
    positioning: "Presencia digital profesional",
    focus: { label: "Presencia", icon: "presence" },
    signature: { kind: "set", steps: ["Tu web", "WhatsApp", "Ubicación"] },
    idealFor: ["Negocios que están empezando", "Emprendimientos locales", "Profesionales independientes"],
    price: "$999.900",
    currency: "COP",
    summary: "Una web profesional para que tu negocio se vea sólido, se entienda rápido y sea fácil de contactar.",
    features: [
      "Web profesional",
      "Diseño responsive",
      "Información del negocio",
      "Contacto y WhatsApp",
      "Ubicación",
      "Presencia digital sólida",
      "Optimización básica de rendimiento",
    ],
    outcomes: [
      { icon: "trust", label: "Más confianza" },
      { icon: "search", label: "Te encuentran más fácil" },
      { icon: "contact", label: "Contacto directo" },
    ],
    ai: { mode: "none", note: "Ideal para comenzar tu presencia digital." },
    cta: { label: "Quiero este plan", intent: "start", message: "Hola Jeipy, me interesa el plan Básico." },
  },
  {
    id: "esencial",
    name: "Esencial",
    positioning: "Una web pensada para captar oportunidades",
    focus: { label: "Captación", icon: "capture" },
    signature: { kind: "flow", steps: ["Visita", "Catálogo", "Contacto", "Oportunidad"] },
    idealFor: ["Negocios que quieren vender más", "Tiendas y catálogos", "Servicios que cotizan"],
    price: "$2.399.000",
    currency: "COP",
    summary: "Una web pensada para vender: muestra lo que ofreces y convierte visitas en oportunidades de negocio.",
    features: [
      "Catálogo de productos o servicios",
      "Formularios de contacto o cotización",
      "SEO básico y Analytics",
      "Estructura comercial",
      "Captación de oportunidades",
      "Integración con WhatsApp",
      "Funciones más avanzadas",
      "Diseño responsive",
    ],
    outcomes: [
      { icon: "growth", label: "Más oportunidades" },
      { icon: "catalog", label: "Clientes mejor informados" },
      { icon: "organize", label: "Contactos organizados" },
    ],
    ai: {
      mode: "addon",
      tag: "Jeipy AI Lite disponible",
      tier: "Jeipy AI Lite",
      description: "Responde preguntas frecuentes, orienta a tus visitantes y convierte consultas en contactos.",
      note: "Complemento opcional · configuración desde $200.000 + operación mensual.",
    },
    cta: { label: "Quiero este plan", intent: "choose", message: "Hola Jeipy, me interesa el plan Esencial." },
    highlight: "Recomendado",
  },
  {
    id: "premium",
    name: "Premium",
    positioning: "Una solución comercial automatizada",
    focus: { label: "Automatización", icon: "automation" },
    positioningNote: "No es una web más grande: capta, organiza y da seguimiento a tus oportunidades. El alcance se define según tu proyecto.",
    signature: { kind: "loop", steps: ["Capta", "Organiza", "Da seguimiento", "Automatiza"] },
    idealFor: ["Negocios en crecimiento", "Reservas, cotizaciones o procesos", "Equipos con muchos clientes"],
    price: "$4.699.000",
    currency: "COP",
    summary: "No es una página más cara: es una herramienta que capta, organiza y da seguimiento a tus oportunidades.",
    features: [
      "Automatización de procesos",
      "Captación y seguimiento de oportunidades",
      "Integraciones con tus herramientas",
      "Flujos comerciales a medida",
      "Funciones personalizadas",
      "Herramientas internas",
      "CRM y seguimiento cuando aplique",
      "Diseño y desarrollo a la medida",
      "Soporte y acompañamiento",
    ],
    outcomes: [
      { icon: "gear", label: "Menos procesos manuales" },
      { icon: "followup", label: "Seguimiento de cada oportunidad" },
      { icon: "scale", label: "Atención que escala" },
    ],
    ai: {
      mode: "featured",
      tag: "Compatible con Jeipy AI Pro",
      tier: "Jeipy AI Pro",
      groups: [
        { label: "Atiende", items: ["Preguntas frecuentes", "Productos y servicios", "Recomendaciones"] },
        { label: "Capta", items: ["Captación de leads", "Formularios conversacionales", "Clasificación de clientes"] },
        { label: "Conecta", items: ["Paso a WhatsApp", "Reservas o agendamiento", "Automatizaciones a medida"] },
      ],
      note: "Se contrata aparte · configuración desde $350.000 + operación mensual según uso.",
    },
    cta: { label: "Quiero este plan", intent: "talk", message: "Hola Jeipy, quiero hablar sobre el plan Premium." },
  },
];
