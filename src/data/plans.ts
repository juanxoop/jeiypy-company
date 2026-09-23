/**
 * Planes comerciales.
 * Precios orientativos: el valor final se define con cada proyecto.
 */

/** Cómo se relaciona cada plan con Jeipy AI. */
export type PlanAi =
  | { mode: "none"; label: string }
  | { mode: "addon"; title: string; tag: string; description: string; note: string }
  | {
      mode: "featured";
      title: string;
      tag: string;
      description: string;
      capabilitiesLabel: string;
      capabilities: string[];
      note: string;
    };

export type Plan = {
  id: "basico" | "esencial" | "premium";
  name: string;
  price: string;
  currency: string;
  summary: string;
  features: string[];
  ai: PlanAi;
  cta: { label: string; message: string };
  highlight?: string;
};

export const jeipyAi = {
  name: "Jeipy AI",
  tagline: "Asistente inteligente para tu negocio",
  costNote:
    "La automatización con IA puede requerir configuración inicial y una mensualidad según el uso, complejidad e integraciones del proyecto.",
} as const;

export const plans: Plan[] = [
  {
    id: "basico",
    name: "Básico",
    price: "$600.000",
    currency: "COP",
    summary:
      "Una página profesional y clara para empezar tu presencia digital con una base sólida, bien diseñada y lista para recibir clientes.",
    features: [
      "Página web informativa",
      "Diseño responsive",
      "Información del negocio",
      "Integración con WhatsApp",
      "Ubicación",
      "Información de contacto",
      "Estructura visual profesional",
      "Optimización básica de rendimiento",
    ],
    ai: { mode: "none", label: "No incluye automatización con IA" },
    cta: { label: "Empezar con Básico", message: "Hola Jeipy, me interesa el plan Básico." },
  },
  {
    id: "esencial",
    name: "Esencial",
    price: "$1.000.000",
    currency: "COP",
    summary:
      "Una presencia digital más completa, con herramientas pensadas para mostrar todo lo que ofreces y captar más clientes.",
    features: [
      "Sitio web más completo",
      "Varias secciones",
      "Catálogo de productos o servicios",
      "Formularios de contacto o cotización",
      "SEO básico",
      "Analytics",
      "Integración con WhatsApp",
      "Optimización de velocidad y experiencia",
      "Diseño responsive",
    ],
    ai: {
      mode: "addon",
      title: jeipyAi.name,
      tag: "Opcional",
      description:
        "Asistente inteligente para responder preguntas frecuentes, orientar visitantes y ayudar a convertir consultas en contactos.",
      note: "No incluido en el precio base. Se cotiza según el proyecto.",
    },
    cta: { label: "Elegir Esencial", message: "Hola Jeipy, me interesa el plan Esencial." },
    highlight: "Más popular",
  },
  {
    id: "premium",
    name: "Premium",
    price: "$1.500.000",
    currency: "COP",
    summary:
      "Una solución más personalizada y automatizada, preparada para acompañar el crecimiento de tu negocio.",
    features: [
      "Diseño web avanzado",
      "Desarrollo más personalizado",
      "Catálogo avanzado",
      "Formularios o flujos personalizados",
      "Integraciones",
      "SEO básico",
      "Analytics",
      "Optimización avanzada",
      "Soporte",
      "Acompañamiento",
      "Actualizaciones",
      "Diseño responsive",
    ],
    ai: {
      mode: "featured",
      title: jeipyAi.name,
      tag: jeipyAi.tagline,
      description:
        "Un asistente para tu negocio capaz de responder dudas, orientar clientes, recopilar información y apoyar tus procesos comerciales.",
      capabilitiesLabel: "Puede incluir, según el proyecto",
      capabilities: [
        "Preguntas frecuentes",
        "Información de productos o servicios",
        "Captación de leads",
        "Formularios conversacionales",
        "Recomendaciones",
        "Clasificación inicial de clientes",
        "Paso a WhatsApp",
        "Reservas o agendamiento",
        "Automatizaciones personalizadas",
      ],
      note: "Las funciones que dependen de servicios externos, como agendas o WhatsApp, se implementan según las herramientas y necesidades de cada proyecto.",
    },
    cta: { label: "Hablar sobre Premium", message: "Hola Jeipy, quiero hablar sobre el plan Premium." },
  },
];
