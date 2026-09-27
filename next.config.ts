import type { NextConfig } from "next";

/**
 * Cabeceras de seguridad para todo el sitio. La CSP es deliberadamente acotada: no restringe
 * scripts ni estilos (Next.js usa scripts en línea y restringirlos exigiría nonces y render dinámico),
 * pero sí impide incrustar el sitio en otros dominios, inyectar <base> u <object> y enviar
 * formularios a otros orígenes.
 */
const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  // Solo tiene efecto sobre HTTPS (Vercel). Sin includeSubDomains para no afectar otros subdominios del dominio propio.
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
