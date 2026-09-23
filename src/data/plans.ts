/**
 * Planes comerciales.
 * Precios orientativos: el valor final se define con cada proyecto.
 */

/** Cómo se relaciona cada plan con Jeipy AI. */
export type PlanAi =
  | { mode: "none"; tag: string }
  | { mode: "addon"; tag: string; description: string; note: string }
  | {
      mode: "featured";
      tag: string;
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
    "Jeipy AI puede requerir configuración inicial y una mensualidad según uso, complejidad e integraciones.",
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
    ai: { mode: "none", tag: "No incluido" },
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
      tag: "Opcional",
      description: "Responde preguntas frecuentes, orienta visitantes y convierte consultas en contactos.",
      note: "Se cotiza aparte del precio base.",
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
      tag: "Según alcance",
      headline: "Responde dudas, orienta clientes y captura oportunidades mientras tú atiendes tu negocio.",
      groups: [
        { label: "Atiende", items: ["Preguntas frecuentes", "Productos y servicios", "Recomendaciones"] },
        { label: "Capta", items: ["Captación de leads", "Formularios conversacionales", "Clasificación de clientes"] },
        { label: "Conecta", items: ["Paso a WhatsApp", "Reservas o agendamiento", "Automatizaciones a medida"] },
      ],
      note: "Automatizaciones avanzadas e integraciones externas según el alcance del proyecto.",
    },
    cta: { label: "Hablar sobre Premium", intent: "talk", message: "Hola Jeipy, quiero hablar sobre el plan Premium." },
  },
];
