export type Plan = {
  id: "basico" | "esencial" | "premium";
  name: string;
  price: string;
  currency: string;
  summary: string;
  features: string[];
  highlight?: string;
};

export const plans: Plan[] = [
  {
    id: "basico",
    name: "Básico",
    price: "$600.000",
    currency: "COP",
    summary: "Ideal para negocios que necesitan comenzar su presencia digital.",
    features: [
      "Página informativa",
      "Diseño responsive",
      "Información del negocio",
      "Integración con WhatsApp",
      "Ubicación",
      "Información de contacto",
    ],
  },
  {
    id: "esencial",
    name: "Esencial",
    price: "$1.000.000",
    currency: "COP",
    summary: "Para negocios que quieren mostrar todo lo que ofrecen y recibir más contactos.",
    features: [
      "Sitio web más completo",
      "Varias secciones",
      "Catálogo o servicios",
      "Formularios",
      "SEO básico",
      "Integración con Analytics",
      "WhatsApp",
      "Optimización",
    ],
    highlight: "Más popular",
  },
  {
    id: "premium",
    name: "Premium",
    price: "$1.500.000",
    currency: "COP",
    summary: "Para marcas que necesitan una experiencia a medida y acompañamiento.",
    features: [
      "Diseño avanzado",
      "Desarrollo personalizado",
      "Catálogo avanzado",
      "Integraciones",
      "Optimización",
      "Soporte",
      "Acompañamiento",
      "Actualizaciones",
    ],
  },
];
