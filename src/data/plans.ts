/**
 * Planes comerciales.
 * Precios orientativos: el valor final se define con cada proyecto.
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
    price: "$600.000",
    currency: "COP",
    summary: "Una página profesional y clara para empezar tu presencia digital con una base sólida.",
    features: [
      "Página web informativa",
      "Diseño responsive",
      "Información del negocio",
      "Integración con WhatsApp",
      "Ubicación y contacto",
      "Estructura visual profesional",
      "Optimización básica de rendimiento",
    ],
    ai: { mode: "none", note: "Ideal para comenzar tu presencia digital." },
    cta: { label: "Empezar con Básico", intent: "start", message: "Hola Jeipy, me interesa el plan Básico." },
  },
  {
    id: "esencial",
    name: "Esencial",
    price: "$1.000.000",
    currency: "COP",
    summary: "Una web más completa, con herramientas para mostrar lo que ofreces y captar clientes.",
    features: [
      "Sitio web más completo",
      "Varias secciones",
      "Catálogo de productos o servicios",
      "Formularios de contacto o cotización",
      "SEO básico y Analytics",
      "Integración con WhatsApp",
      "Velocidad y experiencia optimizadas",
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
    price: "$1.500.000",
    currency: "COP",
    summary: "Una solución personalizada y automatizada, preparada para acompañar tu crecimiento.",
    features: [
      "Diseño web avanzado",
      "Desarrollo personalizado",
      "Catálogo avanzado",
      "Formularios y flujos a medida",
      "Integraciones",
      "SEO básico y Analytics",
      "Optimización avanzada",
      "Soporte y acompañamiento",
      "Actualizaciones",
      "Diseño responsive",
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
