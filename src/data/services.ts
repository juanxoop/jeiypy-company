import type { ServiceIconName } from "@/components/icons/ServiceIcon";

export type Service = {
  title: string;
  description: string;
  icon: ServiceIconName;
};

export const services: Service[] = [
  {
    title: "Diseño Web",
    description: "Experiencias modernas, rápidas y adaptadas a cada negocio.",
    icon: "web",
  },
  {
    title: "Landing Pages",
    description: "Páginas enfocadas en presentar una oferta y generar conversiones.",
    icon: "landing",
  },
  {
    title: "Catálogos Digitales",
    description: "Productos y servicios organizados para que los clientes puedan encontrarlos fácilmente.",
    icon: "catalog",
  },
  {
    title: "Integración con WhatsApp",
    description: "Facilitamos que los visitantes pasen directamente de la web a una conversación.",
    icon: "chat",
  },
  {
    title: "Optimización",
    description: "Velocidad, responsive design, SEO básico y mejoras continuas.",
    icon: "speed",
  },
  {
    title: "Presencia Digital",
    description: "Construimos una imagen profesional y coherente para el negocio.",
    icon: "presence",
  },
];
