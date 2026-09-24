import Link from "next/link";
import { notFound } from "next/navigation";
import { GOAL_LABEL, presenceLabel, CHANNEL_LABEL, WEBSITE_LABEL } from "@/features/leads/labels";
import { CONTACT_CHANNEL_LABEL, recommendationLabel } from "@/features/leads/report";
import { LEAD_STATUSES } from "@/features/leads/types";
import { requireAdmin } from "@/server/admin/auth";
import { getLead } from "@/server/leads/store";
import { setLeadStatus } from "../../actions";
import { NoteForm } from "../_components/NoteForm";
import { StatusBadge } from "../_components/StatusBadge";
import { formatDate, phoneDigits, statusLabel, whatsappHref } from "../_components/format";

/** Datos privados y por usuario: nunca se prerenderiza ni se cachea. */
export const dynamic = "force-dynamic";


function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-2.5 sm:grid-cols-[11rem_1fr] sm:gap-4">
      <dt className="text-sm text-mist">{label}</dt>
      <dd className="text-sm text-snow/90">{children || "—"}</dd>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-mist">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

const formatCop = (n: number) => `$${n.toLocaleString("es-CO")} COP`;

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const data = await getLead(id);
  if (!data) notFound();
  const { lead, notes } = data;

  const quick = (status: (typeof LEAD_STATUSES)[number], label: string, primary = false) => (
    <form action={setLeadStatus}>
      <input type="hidden" name="id" value={lead.id} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        disabled={lead.status === status}
        className={
          primary
            ? "h-10 rounded-full bg-jeipy px-4 text-sm font-medium text-white hover:bg-[#2a76ff] disabled:opacity-40"
            : "h-10 rounded-full border border-line-strong px-4 text-sm text-snow hover:border-glow/40 disabled:opacity-40"
        }
      >
        {label}
      </button>
    </form>
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link href="/admin/leads" className="text-sm text-glow hover:underline">
        ← Volver a la bandeja
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">{lead.name}</h1>
            <StatusBadge status={lead.status} />
          </div>
          <p className="mt-1 text-sm text-mist">
            {[lead.businessName, lead.businessType].filter(Boolean).join(" · ") || "Negocio sin especificar"} · Recibido {formatDate(lead.createdAt)}
            {lead.updatedAt !== lead.createdAt && ` · Actualizado ${formatDate(lead.updatedAt)}`}
          </p>
        </div>
      </header>

      <div className="mt-6 flex flex-wrap gap-2">
        <a href={`tel:+${phoneDigits(lead.phone)}`} className="inline-flex h-10 items-center rounded-full bg-jeipy px-4 text-sm font-medium text-white hover:bg-[#2a76ff]">
          Llamar
        </a>
        <a href={whatsappHref(lead)} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center rounded-full border border-glow/40 px-4 text-sm font-medium text-snow hover:bg-jeipy/10">
          Abrir WhatsApp
        </a>
        {lead.email && (
          <a href={`mailto:${lead.email}`} className="inline-flex h-10 items-center rounded-full border border-line-strong px-4 text-sm text-snow hover:border-glow/40">
            Enviar correo
          </a>
        )}
        {quick("contactado", "Marcar como contactado")}
        {quick("cerrado", "Marcar como cerrado")}
      </div>

      <form action={setLeadStatus} className="mt-4 flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={lead.id} />
        <label htmlFor="status" className="text-sm text-mist">
          Cambiar estado
        </label>
        <select key={lead.status} id="status" name="status" defaultValue={lead.status} className="h-10 rounded-full border border-line-strong bg-surface px-3 text-sm text-snow">
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </select>
        <button type="submit" className="h-10 rounded-full border border-line-strong px-4 text-sm text-snow hover:border-glow/40">
          Guardar estado
        </button>
      </form>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <Panel title="Contacto">
          <dl className="divide-y divide-line">
            <Field label="Teléfono">{lead.phone}</Field>
            <Field label="Email">{lead.email}</Field>
            <Field label="Canal preferido">{lead.preferredChannel ? CONTACT_CHANNEL_LABEL[lead.preferredChannel] : undefined}</Field>
            <Field label="Solicita llamada">{lead.callbackRequested ? "Sí" : "No"}</Field>
            <Field label="Horario preferido">{lead.preferredTime}</Field>
            <Field label="Autorizó contacto">{formatDate(lead.consentAt)}</Field>
          </dl>
        </Panel>

        <Panel title="Negocio y presencia digital">
          <dl className="divide-y divide-line">
            <Field label="Nombre del negocio">{lead.businessName}</Field>
            <Field label="Tipo de negocio">{lead.businessType}</Field>
            <Field label="Descripción">{lead.businessDescription}</Field>
            <Field label="Canales actuales">
              {lead.channels.filter((c) => c !== "none").map((c) => CHANNEL_LABEL[c]).join(", ") || (lead.channels.includes("none") ? "Ninguno" : undefined)}
            </Field>
            <Field label="Página web">{lead.websiteStatus ? WEBSITE_LABEL[lead.websiteStatus] : undefined}</Field>
            <Field label="Resumen">{presenceLabel(lead.channels, lead.websiteStatus)}</Field>
          </dl>
        </Panel>

        <Panel title="Diagnóstico">
          <dl className="divide-y divide-line">
            <Field label="Objetivo">{lead.goal ? GOAL_LABEL[lead.goal] : undefined}</Field>
            <Field label="Necesidades">{lead.needs.join(" + ")}</Field>
            <Field label="Interés en IA">{lead.aiInterest ? `Sí${lead.aiLevel === "advanced" ? " · avanzada" : lead.aiLevel === "basic" ? " · básica" : ""}` : "No"}</Field>
            <Field label="Presupuesto">{lead.budget ? formatCop(lead.budget) : undefined}</Field>
          </dl>
        </Panel>

        <Panel title="Recomendación">
          <dl className="divide-y divide-line">
            <Field label="Plan y Jeipy AI">{recommendationLabel(lead)}</Field>
            <Field label="Intención">{lead.intent === "callback" ? "Solicita una llamada" : "Quiere una cotización"}</Field>
          </dl>
        </Panel>
      </div>

      <div className="mt-5">
        <Panel title="Resumen comercial">
          <p className="text-sm leading-relaxed text-snow/90">{lead.summary}</p>
        </Panel>
      </div>

      <div className="mt-5">
        <Panel title={`Notas internas (${notes.length})`}>
          <NoteForm leadId={lead.id} />
          {notes.length > 0 && (
            <ul className="mt-5 space-y-3">
              {notes.map((note) => (
                <li key={note.id} className="rounded-xl border border-line bg-white/[0.02] p-3">
                  <p className="whitespace-pre-wrap text-sm text-snow/90">{note.body}</p>
                  <p className="mt-1 text-xs text-mist">
                    {note.author ?? "Equipo"} · {formatDate(note.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {lead.transcript?.length ? (
        <details className="mt-5 rounded-2xl border border-line bg-surface p-5">
          <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-[0.18em] text-mist">Conversación con Jeipy AI</summary>
          <ol className="mt-4 space-y-2 text-sm">
            {lead.transcript.map((m, i) => (
              <li key={i} className={m.role === "user" ? "text-snow" : "text-mist"}>
                <span className="font-medium">{m.role === "user" ? "Cliente" : "Jeipy AI"}:</span> <span className="whitespace-pre-wrap">{m.text}</span>
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </main>
  );
}
