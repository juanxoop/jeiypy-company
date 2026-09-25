/**
 * Iconos de línea para planes y recomendaciones de Jeipy AI (16×16, trazo 1.3, color heredado).
 * Todos son decorativos: el texto que los acompaña es el que da el significado.
 */
export type FeatureIconName =
  | "presence"
  | "capture"
  | "automation"
  | "trust"
  | "search"
  | "contact"
  | "growth"
  | "catalog"
  | "form"
  | "analytics"
  | "location"
  | "ai"
  | "integration"
  | "booking"
  | "followup"
  | "organize"
  | "scale"
  | "gear"
  | "whatsapp";

const paths: Record<FeatureIconName, React.ReactNode> = {
  presence: (
    <>
      <rect x="2" y="3" width="12" height="10" rx="1.6" />
      <path d="M2 6h12M4.4 4.5h.01M6 4.5h.01" />
    </>
  ),
  capture: (
    <>
      <circle cx="8" cy="8" r="5.6" />
      <circle cx="8" cy="8" r="2.8" />
      <path d="M8 8h.01" />
    </>
  ),
  automation: (
    <>
      <path d="M13 6.2A5.2 5.2 0 0 0 3.4 5M3 9.8A5.2 5.2 0 0 0 12.6 11" />
      <path d="M13.2 3.2v3h-3M2.8 12.8v-3h3" />
    </>
  ),
  trust: (
    <>
      <path d="M8 2 3 3.8v3.8c0 3 2.1 5.4 5 6.4 2.9-1 5-3.4 5-6.4V3.8L8 2Z" />
      <path d="m5.8 8 1.5 1.5 3-3" />
    </>
  ),
  search: (
    <>
      <circle cx="7" cy="7" r="4.4" />
      <path d="m10.3 10.3 3.2 3.2" />
    </>
  ),
  contact: <path d="M3 3.5h10a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H7l-3 2.5V11.5H3a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1Z" />,
  growth: (
    <>
      <path d="m2.5 11.5 3.8-3.8 2.6 2.6 4.6-4.8" />
      <path d="M10.5 5.5h3v3" />
    </>
  ),
  catalog: (
    <>
      <rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1" />
      <rect x="9" y="2.5" width="4.5" height="4.5" rx="1" />
      <rect x="2.5" y="9" width="4.5" height="4.5" rx="1" />
      <rect x="9" y="9" width="4.5" height="4.5" rx="1" />
    </>
  ),
  form: (
    <>
      <rect x="3" y="2" width="10" height="12" rx="1.5" />
      <path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3" />
    </>
  ),
  analytics: <path d="M3 13V9M6.3 13V5.5M9.7 13V7.5M13 13V3" />,
  location: (
    <>
      <path d="M8 14s4.5-4 4.5-7.5a4.5 4.5 0 0 0-9 0C3.5 10 8 14 8 14Z" />
      <circle cx="8" cy="6.5" r="1.6" />
    </>
  ),
  ai: <path d="M8 2.2 9.3 6.7 13.8 8 9.3 9.3 8 13.8 6.7 9.3 2.2 8l4.5-1.3L8 2.2Z" />,
  integration: (
    <>
      <path d="M6 2.5v3M10 2.5v3" />
      <path d="M4 5.5h8v2.2A4 4 0 0 1 8 11.7a4 4 0 0 1-4-4V5.5Z" />
      <path d="M8 11.7v1.8" />
    </>
  ),
  booking: (
    <>
      <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" />
      <path d="M2.5 6.5h11M5.5 2v3M10.5 2v3M6 9.8l1.4 1.4 2.6-2.6" />
    </>
  ),
  followup: (
    <>
      <path d="M3 8a5 5 0 1 0 1.5-3.6" />
      <path d="M3.2 2.4v2.2h2.2M8 5.4V8l1.8 1.2" />
    </>
  ),
  organize: <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h7" />,
  scale: (
    <>
      <path d="m8 2.5 5.5 3L8 8.5l-5.5-3L8 2.5Z" />
      <path d="m2.5 8.2 5.5 3 5.5-3M2.5 10.9l5.5 3 5.5-3" />
    </>
  ),
  gear: (
    <>
      <circle cx="8" cy="8" r="2" />
      <path d="M8 2v1.6M8 12.4V14M2 8h1.6M12.4 8H14M3.8 3.8l1.1 1.1M11.1 11.1l1.1 1.1M3.8 12.2l1.1-1.1M11.1 4.9l1.1-1.1" />
    </>
  ),
  whatsapp: (
    <>
      <path d="M3 13.2 3.8 10.6A5.4 5.4 0 1 1 5.6 12.3L3 13.2Z" />
      <path d="M6.3 6.2c.2 1.5 1.9 3.2 3.5 3.5l.8-.9-1.1-.6-.5.5c-.6-.2-1.3-.9-1.5-1.5l.5-.5-.6-1.1-1.1.6Z" />
    </>
  ),
};

export function FeatureIcon({ name, className }: { name: FeatureIconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {paths[name]}
    </svg>
  );
}
