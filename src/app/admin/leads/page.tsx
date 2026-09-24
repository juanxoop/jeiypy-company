import Link from "next/link";
import type { LeadRow, LeadStatus } from "@/features/leads/types";
import { requireAdmin } from "@/server/admin/auth";
import { listLeads, storeHealth } from "@/server/leads/store";
import { logout } from "../actions";
import { AutoRefresh } from "./_components/AutoRefresh";
import { StatusBadge } from "./_components/StatusBadge";
import { aiName, businessName, formatDate, needsText, planName, statusLabel } from "./_components/format";

/** Datos privados y por usuario: nunca se prerenderiza ni se cachea. */
export const dynamic = "force-dynamic";


const COUNTERS: { status: LeadStatus; label: string }[] = [
  { status: "nuevo", label: "Nuevos" },
  { status: "solicita-llamada", label: "Solicitudes de llamada" },
  { status: "cotizacion", label: "Cotizaciones" },
  { status: "interesado", label: "Interesados" },
  { status: "cerrado", label: "Cerrados" },
];

export default async function LeadsInboxPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  await requireAdmin();
  const { estado } = await searchParams;

  const health = await storeHealth();
  let leads: LeadRow[] = [];
  let loadError: string | undefined;
  if (health.ok) {
    try {
      leads = await listLeads();
    } catch (error) {
      console.error("[admin] No se pudieron leer los leads:", error);
      loadError = "No se pudieron leer los leads de la base de datos. Revisa los registros del servidor.";
    }
  }
  const count = (status: LeadStatus) => leads.filter((l) => l.status === status).length;
  const filter = COUNTERS.some((c) => c.status === estado) || estado === "contactado" || estado === "no-interesado" ? (estado as LeadStatus) : undefined;
  const visible = filter ? leads.filter((l) => l.status === filter) : leads;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-glow">Jeipy Company · Privado</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">Bandeja de solicitudes</h1>
          <div className="mt-2">
            <AutoRefresh renderedAt={new Date().toISOString()} />
          </div>
        </div>
        <form action={logout}>
          <button type="submit" className="h-10 rounded-full border border-line-strong px-4 text-sm text-mist hover:border-glow/40 hover:text-snow">
            Cerrar sesión
          </button>
        </form>
      </header>

      {!health.ok && (
        <div role="alert" className="mt-6 rounded-2xl border border-[#ffb547]/40 bg-[#ffb547]/10 p-4 text-sm text-[#ffd9a0]">
          <p className="font-medium text-snow">La base de datos no está lista</p>
          <p className="mt-1">{health.reason}</p>
        </div>
      )}
      {loadError && (
        <p role="alert" className="mt-6 rounded-2xl border border-[#ff8a8a]/40 bg-[#ff8a8a]/10 p-4 text-sm text-[#ffc2c2]">
          {loadError}
        </p>
      )}

      <nav aria-label="Filtrar por estado" className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {COUNTERS.map((c) => (
          <Link
            key={c.status}
            href={filter === c.status ? "/admin/leads" : `/admin/leads?estado=${c.status}`}
            aria-current={filter === c.status ? "true" : undefined}
            className="rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-glow/40 aria-[current=true]:border-glow/60 aria-[current=true]:bg-jeipy/10"
          >
            <span className="block text-3xl font-semibold tracking-[-0.03em]">{count(c.status)}</span>
            <span className="mt-1 block text-xs text-mist">{c.label}</span>
          </Link>
        ))}
      </nav>

      <section className="mt-8" aria-labelledby="listado">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="listado" className="text-sm font-medium text-snow">
            {filter ? `${statusLabel(filter)} (${visible.length})` : `Todas las solicitudes (${leads.length})`}
          </h2>
          {filter && (
            <Link href="/admin/leads" className="text-xs text-glow hover:underline">
              Ver todas
            </Link>
          )}
        </div>

        {visible.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-line-strong p-8 text-center text-sm text-mist">
            {health.ok ? "Aún no hay solicitudes en este estado." : "Configura la base de datos para ver las solicitudes."}
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-line">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-white/[0.03] text-xs uppercase tracking-wider text-mist">
                <tr>
                  {["Nombre", "Negocio", "Necesidad", "Plan", "Jeipy AI", "Estado", "Fecha"].map((h) => (
                    <th key={h} scope="col" className="px-4 py-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visible.map((lead) => (
                  <tr key={lead.id} className="transition-colors hover:bg-white/[0.03]">
                    <td className="px-4 py-3">
                      <Link href={`/admin/leads/${lead.id}`} className="font-medium text-snow hover:text-glow">
                        {lead.name}
                      </Link>
                      <span className="block text-xs text-mist">{lead.phone}</span>
                    </td>
                    <td className="px-4 py-3 text-snow/85">{businessName(lead)}</td>
                    <td className="max-w-[16rem] px-4 py-3 text-snow/85">{needsText(lead)}</td>
                    <td className="px-4 py-3 text-snow/85">{planName(lead)}</td>
                    <td className="px-4 py-3 text-snow/85">{aiName(lead)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-mist">{formatDate(lead.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
