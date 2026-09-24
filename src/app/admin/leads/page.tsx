import Link from "next/link";
import { isClosedStatus, type LeadNote, type LeadRow } from "@/features/leads/types";
import { requireAdmin } from "@/server/admin/auth";
import { getLead, listLeads, storeHealth } from "@/server/leads/store";
import { logout } from "../actions";
import { AutoRefresh } from "./_components/AutoRefresh";
import { DrawerClose } from "./_components/DrawerClose";
import { LeadDetail } from "./_components/LeadDetail";
import { StatusBadge } from "./_components/StatusBadge";
import { INBOX_FILTERS, aiName, businessName, formatDate, needsText, parseFilter, planName, type InboxFilter } from "./_components/format";

/** Datos privados y por usuario: nunca se prerenderiza ni se cachea. */
export const dynamic = "force-dynamic";

const inboxHref = (filter: InboxFilter, lead?: string) => {
  const params = new URLSearchParams();
  if (filter !== "activos") params.set("filtro", filter);
  if (lead) params.set("lead", lead);
  const query = params.toString();
  return `/admin/leads${query ? `?${query}` : ""}`;
};

export default async function LeadsInboxPage({ searchParams }: { searchParams: Promise<{ filtro?: string; lead?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const filter = parseFilter(params.filtro);

  const health = await storeHealth();
  let leads: LeadRow[] = [];
  let loadError: string | undefined;
  let selected: { lead: LeadRow; notes: LeadNote[] } | null = null;
  if (health.ok) {
    try {
      [leads, selected] = await Promise.all([listLeads(), params.lead ? getLead(params.lead) : Promise.resolve(null)]);
    } catch (error) {
      console.error("[admin] No se pudieron leer los leads:", error);
      loadError = "No se pudieron leer los leads de la base de datos. Revisa los registros del servidor.";
    }
  }

  const current = INBOX_FILTERS.find((f) => f.id === filter)!;
  const visible = leads.filter((l) => current.match(l.status));
  const closedBreakdown = {
    ganado: leads.filter((l) => l.status === "cerrado-ganado").length,
    noInteresado: leads.filter((l) => l.status === "cerrado-no-interesado").length,
    sinRespuesta: leads.filter((l) => l.status === "cerrado-sin-respuesta").length,
  };
  const closeHref = inboxHref(filter);

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
        <div className="flex items-center gap-2">
          <a href="/api/health" target="_blank" rel="noopener noreferrer" className="h-10 content-center rounded-full border border-line-strong px-4 text-sm text-mist hover:border-glow/40 hover:text-snow">
            Estado del sistema
          </a>
          <form action={logout}>
            <button type="submit" className="h-10 rounded-full border border-line-strong px-4 text-sm text-mist hover:border-glow/40 hover:text-snow">
              Cerrar sesión
            </button>
          </form>
        </div>
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

      <nav aria-label="Filtros" className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {INBOX_FILTERS.map((f) => (
          <Link
            key={f.id}
            href={inboxHref(f.id)}
            aria-current={filter === f.id ? "page" : undefined}
            className="rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-glow/40 aria-[current=page]:border-glow/60 aria-[current=page]:bg-jeipy/10"
          >
            <span className="block text-3xl font-semibold tracking-[-0.03em]">{leads.filter((l) => f.match(l.status)).length}</span>
            <span className="mt-1 block text-xs text-mist">{f.label}</span>
          </Link>
        ))}
      </nav>

      <section className="mt-8" aria-labelledby="listado">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="listado" className="text-sm font-medium text-snow">
            {current.label} ({visible.length})
          </h2>
          {filter === "cerrados" && (
            <p className="text-xs text-mist">
              Ganados {closedBreakdown.ganado} · No interesados {closedBreakdown.noInteresado} · Sin respuesta {closedBreakdown.sinRespuesta}
            </p>
          )}
        </div>

        {visible.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-line-strong p-8 text-center text-sm text-mist">
            {health.ok ? "No hay solicitudes en este filtro." : "Configura la base de datos para ver las solicitudes."}
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-line">
            <table className="w-full min-w-[880px] text-left text-sm">
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
                {visible.map((lead) => {
                  const href = inboxHref(filter, lead.id);
                  const cell = "block px-4 py-3";
                  const active = selected?.lead.id === lead.id;
                  return (
                    <tr
                      key={lead.id}
                      className={`cursor-pointer transition-colors hover:bg-white/[0.04] ${active ? "bg-jeipy/10" : ""} ${isClosedStatus(lead.status) ? "opacity-75" : ""}`}
                    >
                      {/* Toda la fila abre la ficha; solo la primera celda es tabulable. */}
                      <td>
                        <Link href={href} scroll={false} className={`${cell} font-medium text-snow`}>
                          {lead.name}
                          <span className="block text-xs font-normal text-mist">{lead.phone}</span>
                        </Link>
                      </td>
                      {[businessName(lead), needsText(lead), planName(lead), aiName(lead)].map((value, i) => (
                        <td key={i}>
                          <Link href={href} scroll={false} tabIndex={-1} className={`${cell} text-snow/85`}>
                            {value}
                          </Link>
                        </td>
                      ))}
                      <td>
                        <Link href={href} scroll={false} tabIndex={-1} className={cell}>
                          <StatusBadge status={lead.status} />
                        </Link>
                      </td>
                      <td>
                        <Link href={href} scroll={false} tabIndex={-1} className={`${cell} whitespace-nowrap text-mist`}>
                          {formatDate(lead.createdAt)}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Ficha del lead en panel lateral */}
      {params.lead && (
        <div role="dialog" aria-modal="true" aria-label="Ficha del lead" className="fixed inset-0 z-50 flex justify-end">
          <DrawerClose href={closeHref} />
          <Link href={closeHref} scroll={false} aria-label="Cerrar ficha" className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
          <aside className="relative h-full w-full max-w-2xl overflow-y-auto border-l border-line-strong bg-ink p-5 shadow-2xl sm:p-7">
            <div className="mb-4 flex items-center justify-between gap-3">
              <Link href={closeHref} scroll={false} className="text-sm text-glow hover:underline">
                ← Volver a la bandeja
              </Link>
              {selected && (
                <Link href={`/admin/leads/${selected.lead.id}`} className="text-xs text-mist hover:text-snow">
                  Abrir en página completa ↗
                </Link>
              )}
            </div>
            {selected ? <LeadDetail lead={selected.lead} notes={selected.notes} /> : <p className="text-sm text-mist">No se encontró este lead.</p>}
          </aside>
        </div>
      )}
    </main>
  );
}
