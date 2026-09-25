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
      headline: string;
      /** Capacidades agrupadas por el resultado de negocio que producen. */
      groups: { label: string; items: string[] }[];
      note: string;
    };

export type PlanCtaIntent = "start" | "choose" | "talk";

export type Plan = {
  id: "basico" | "esencial" | "premium";
  name: string;
  /** Promesa del plan en una línea (lo que el cliente compra, no "una página más cara"). */
  positioning: string;
  price: string;
  currency: string;
  summary: string;
  features: string[];
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
    ai: { mode: "none", note: "Ideal para comenzar tu presencia digital." },
    cta: { label: "Empezar con Básico", intent: "start", message: "Hola Jeipy, me interesa el plan Básico." },
  },
  {
    id: "esencial",
    name: "Esencial",
    positioning: "Web comercial orientada a captación",
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
    ai: {
      mode: "addon",
      tag: "Jeipy AI Lite disponible",
      tier: "Jeipy AI Lite",
      description: "Responde preguntas frecuentes, orienta a tus visitantes y convierte consultas en contactos.",
      note: "Complemento opcional · configuración desde $200.000 + operación mensual.",
    },
    cta: { label: "Elegir Esencial", intent: "choose", message: "Hola Jeipy, me interesa el plan Esencial." },
    highlight: "Más popular",
  },
  {
    id: "premium",
    name: "Premium",
    positioning: "Solución digital comercial y automatizada",
    price: "$4.699.000",
    currency: "COP",
    summary: "No es una página más cara: es una herramienta que capta, organiza y da seguimiento a tus oportunidades. Incluye según el alcance:",
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
    ai: {
      mode: "featured",
      tag: "Compatible con Jeipy AI Pro",
      tier: "Jeipy AI Pro",
      headline: "Responde dudas, orienta clientes y captura oportunidades mientras tú atiendes tu negocio.",
      groups: [
        { label: "Atiende", items: ["Preguntas frecuentes", "Productos y servicios", "Recomendaciones"] },
        { label: "Capta", items: ["Captación de leads", "Formularios conversacionales", "Clasificación de clientes"] },
        { label: "Conecta", items: ["Paso a WhatsApp", "Reservas o agendamiento", "Automatizaciones a medida"] },
      ],
      note: "Se contrata aparte · configuración desde $350.000 + operación mensual según uso.",
    },
    cta: { label: "Hablar sobre Premium", intent: "talk", message: "Hola Jeipy, quiero hablar sobre el plan Premium." },
  },
];
