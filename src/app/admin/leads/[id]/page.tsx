import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/admin/auth";
import { getLead } from "@/server/leads/store";
import { LeadDetail } from "../_components/LeadDetail";

/** Datos privados y por usuario: nunca se prerenderiza ni se cachea. */
export const dynamic = "force-dynamic";

/** Vista dedicada de un lead (enlace directo, p. ej. desde el correo de aviso). */
export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const data = await getLead(id);
  if (!data) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/admin/leads" className="text-sm text-glow hover:underline">
        ← Volver a la bandeja
      </Link>
      <div className="mt-4">
        <LeadDetail lead={data.lead} notes={data.notes} />
      </div>
    </main>
  );
}
