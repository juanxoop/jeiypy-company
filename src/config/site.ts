/**
 * Configuración central de la marca.
 * Todo lo que cambia con frecuencia (contacto, redes, SEO, navegación) vive aquí.
 */

function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export const siteConfig = {
  name: "Jeipy Company",
  shortName: "Jeipy",
  slogan: "Tecnología a tu alcance",
  url: resolveSiteUrl(),
  locale: "es_CO",
  language: "es",
  country: "Colombia",
  seo: {
    title: "Jeipy Company | Diseño web para negocios",
    description:
      "Creamos páginas web modernas y personalizadas para negocios, emprendedores y marcas que quieren crecer en el mundo digital.",
    keywords: [
      "diseño web",
      "páginas web para negocios",
      "landing pages",
      "catálogos digitales",
      "diseño web Colombia",
      "presencia digital",
      "Jeipy Company",
    ],
  },
  theme: {
    background: "#05070B",
    accent: "#1769FF",
  },
} as const;

/**
 * Contacto.
 * `whatsappNumber`: formato internacional sin "+", espacios ni guiones.
 * Ejemplo de formato para Colombia: "57" + número de 10 dígitos.
 * Se configura con la variable NEXT_PUBLIC_WHATSAPP_NUMBER (ver .env.example).
 * Mientras esté vacío, los botones de contacto llevan a la sección #contacto.
 */
export const contactConfig = {
  whatsappNumber: (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, ""),
  /** Teléfono para llamadas directas (NEXT_PUBLIC_CONTACT_PHONE); si falta, se usa el de WhatsApp. */
  phone: (process.env.NEXT_PUBLIC_CONTACT_PHONE || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "").replace(/\D/g, ""),
  defaultMessage: "Hola Jeipy, quiero digitalizar mi negocio.",
  fallbackHref: "#contacto",
} as const;

export type SocialId = "instagram" | "tiktok" | "whatsapp";

export type SocialLink = {
  id: SocialId;
  label: string;
  /** Dejar vacío hasta tener la cuenta oficial. */
  href: string;
};

export const socialLinks: SocialLink[] = [
  { id: "instagram", label: "Instagram", href: "" },
  { id: "tiktok", label: "TikTok", href: "" },
  { id: "whatsapp", label: "WhatsApp", href: "" },
];

export type NavItem = { label: string; href: `#${string}` };

export const mainNav: NavItem[] = [
  { label: "Servicios", href: "#servicios" },
  { label: "Portafolio", href: "#portafolio" },
  { label: "Planes", href: "#planes" },
  { label: "Proceso", href: "#proceso" },
  { label: "Contacto", href: "#contacto" },
];

export const footerNav: NavItem[] = [
  { label: "Inicio", href: "#inicio" },
  { label: "Servicios", href: "#servicios" },
  { label: "Portafolio", href: "#portafolio" },
  { label: "Planes", href: "#planes" },
  { label: "Contacto", href: "#contacto" },
];
