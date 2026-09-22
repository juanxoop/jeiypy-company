import { contactConfig, socialLinks } from "@/config/site";

export function isWhatsAppConfigured(): boolean {
  return contactConfig.whatsappNumber.trim().length > 0;
}

/**
 * Devuelve el enlace de contacto principal.
 * Si hay número de WhatsApp configurado abre la conversación con un mensaje
 * prellenado; si no, lleva a la sección de contacto.
 */
export function getContactHref(message: string = contactConfig.defaultMessage): string {
  if (!isWhatsAppConfigured()) return contactConfig.fallbackHref;
  const number = contactConfig.whatsappNumber.replace(/\D/g, "");
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function isExternalHref(href: string): boolean {
  return /^https?:\/\//.test(href);
}

/** Redes con enlace configurado. WhatsApp usa el número de contacto si no tiene href propio. */
export function getSocialLinks() {
  return socialLinks.map((social) => {
    if (social.id === "whatsapp" && !social.href && isWhatsAppConfigured()) {
      return { ...social, href: getContactHref() };
    }
    return social;
  });
}
