import type { Metadata } from "next";

/** Datos privados y por usuario: nunca se prerenderiza ni se cachea. */
export const dynamic = "force-dynamic";


export const metadata: Metadata = {
  title: "Bandeja de solicitudes",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-ink text-snow">{children}</div>;
}
