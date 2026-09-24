import { CHANNEL_LABEL, GOAL_LABEL, WEBSITE_LABEL } from "@/features/leads/labels";
import { CONTACT_CHANNEL_LABEL, recommendationLabel } from "@/features/leads/report";
import { LEAD_STATUSES, isClosedStatus, type LeadNote, type LeadRow, type LeadStatus } from "@/features/leads/types";
import { getAiTier } from "@/data/jeipyAi";
import { plans } from "@/data/plans";
import { setLeadStatus } from "../../actions";
import { NoteForm } from "./NoteForm";
import { StatusBadge } from "./StatusBadge";
import { formatDate, phoneDigits, statusLabel, whatsappHref } from "./format";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 py-2 sm:grid-cols-[10.5rem_1fr] sm:gap-4">
      <dt className="text-sm text-mist">{label}</dt>
      <dd className="text-sm text-snow/90">{children || "—"}</dd>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-mist">{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

const formatCop = (n: number) => `$${n.toLocaleString("es-CO")} COP`;

/** Botón que cambia el estado. Cerrar nunca borra el lead: queda consultable en "Cerrados". */
function StatusButton({ lead, status, label, tone = "default" }: { lead: LeadRow; status: LeadStatus; label: string; tone?: "default" | "primary" | "win" }) {
  const styles = {
    default: "border border-line-strong text-snow hover:border-glow/40",
    primary: "bg-jeipy text-white hover:bg-[#2a76ff]",
    win: "border border-[#34d399]/50 bg-[#34d399]/10 text-[#a7f3d0] hover:bg-[#34d399]/20",
  }[tone];
  return (
    <form action={setLeadStatus}>
      <input type="hidden" name="id" value={lead.id} />
      <input type="hidden" name="status" value={status} />
      <button type="submit" disabled={lead.status === status} className={`h-9 rounded-full px-3.5 text-sm font-medium transition-colors disabled:opacity-40 ${styles}`}>
        {label}
      </button>
    </form>
  );
}

function Activity({ notes }: { notes: LeadNote[] }) {
  if (!notes.length) return <p className="text-sm text-mist">Sin actividad todavía.</p>;
  return (
    <ol className="space-y-2.5">
      {notes.map((item) => (
        <li key={item.id} className="flex gap-3">
          <span
            aria-hidden
            className={`mt-1.5 size-2 shrink-0 rounded-full ${item.kind === "status" ? "bg-glow" : "bg-[#ffb547]"}`}
          />
          <div className="min-w-0">
            {item.kind === "status" ? (
              <p className="text-sm text-snow/90">
                {item.fromStatus ? (
                  <>
                    Estado: {statusLabel(item.fromStatus)} → <strong className="font-medium text-snow">{item.toStatus ? statusLabel(item.toStatus) : "—"}</strong>
                  </>
                ) : (
                  <>
                    {item.body} · <strong className="font-medium text-snow">{item.toStatus ? statusLabel(item.toStatus) : ""}</strong>
                  </>
                )}
              </p>
            ) : (
              <p className="whitespace-pre-wrap text-sm text-snow/90">
                <span className="mr-1 text-[#ffc97a]">Nota:</span>
                {item.body}
              </p>
            )}
            <p className="text-xs text-mist">
              {item.author ?? "Equipo"} · {formatDate(item.createdAt)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Ficha completa del lead, usada en el panel lateral de la bandeja y en su página propia. */
export function LeadDetail({ lead, notes }: { lead: LeadRow; notes: LeadNote[] }) {
  const closed = isClosedStatus(lead.status);
  const planName = lead.recommendedPlan ? plans.find((p) => p.id === lead.recommendedPlan)?.name : undefined;
  const channels = lead.channels.filter((c) => c !== "none").map((c) => CHANNEL_LABEL[c]);

  return (
    <div className="space-y-4">
      <header>
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-xl font-semibold tracking-[-0.02em] sm:text-2xl">{lead.name}</h2>
          <StatusBadge status={lead.status} />
        </div>
        <p className="mt-1 text-sm text-mist">
          {lead.businessName ?? lead.businessType ?? "Negocio sin especificar"} · Creado {formatDate(lead.createdAt)} · Actualizado {formatDate(lead.updatedAt)}
          {lead.closedAt && ` · Cerrado ${formatDate(lead.closedAt)}`}
        </p>
      </header>

      {/* Contacto inmediato */}
      <div className="flex flex-wrap gap-2">
        <a href={`tel:+${phoneDigits(lead.phone)}`} className="inline-flex h-9 items-center rounded-full bg-jeipy px-4 text-sm font-medium text-white hover:bg-[#2a76ff]">
          Llamar
        </a>
        <a href={whatsappHref(lead)} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center rounded-full border border-glow/40 px-4 text-sm font-medium text-snow hover:bg-jeipy/10">
          Abrir WhatsApp
        </a>
        {lead.email && (
          <a href={`mailto:${lead.email}`} className="inline-flex h-9 items-center rounded-full border border-line-strong px-4 text-sm text-snow hover:border-glow/40">
            Enviar correo
          </a>
        )}
      </div>

      {/* Gestión del estado */}
      <div className="rounded-2xl border border-line bg-white/[0.02] p-4">
        <p className="text-xs text-mist">{closed ? "Este lead está cerrado. Puedes reabrirlo cambiando su estado." : "Gestión del lead"}</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <StatusButton lead={lead} status="contactado" label="Marcar como contactado" tone="primary" />
          <StatusButton lead={lead} status="cerrado-ganado" label="Cerrar como ganado" tone="win" />
          <StatusButton lead={lead} status="cerrado-no-interesado" label="Cerrar: no interesado" />
          <StatusButton lead={lead} status="cerrado-sin-respuesta" label="Cerrar: sin respuesta" />
        </div>
        <form action={setLeadStatus} className="mt-3 flex flex-wrap items-center gap-2">
          <input type="hidden" name="id" value={lead.id} />
          <label htmlFor={`status-${lead.id}`} className="text-sm text-mist">
            Cambiar estado
          </label>
          <select
            key={lead.status}
            id={`status-${lead.id}`}
            name="status"
            defaultValue={lead.status}
            className="h-9 rounded-full border border-line-strong bg-surface px-3 text-sm text-snow"
          >
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
          <button type="submit" className="h-9 rounded-full border border-line-strong px-3.5 text-sm text-snow hover:border-glow/40">
            Guardar
          </button>
        </form>
      </div>

      <Panel title="Resumen comercial">
        <p className="text-sm leading-relaxed text-snow/90">{lead.summary}</p>
      </Panel>

      <Panel title="Contacto">
        <dl className="divide-y divide-line">
          <Field label="Nombre">{lead.name}</Field>
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
          <Field label="Negocio">{lead.businessName}</Field>
          <Field label="Tipo de negocio">{lead.businessType}</Field>
          <Field label="Descripción">{lead.businessDescription}</Field>
          <Field label="Canales actuales">{channels.join(", ") || (lead.channels.includes("none") ? "Ninguno" : undefined)}</Field>
          <Field label="Página web">{lead.websiteStatus ? WEBSITE_LABEL[lead.websiteStatus] : undefined}</Field>
        </dl>
      </Panel>

      <Panel title="Diagnóstico y recomendación">
        <dl className="divide-y divide-line">
          <Field label="Objetivo">{lead.goal ? GOAL_LABEL[lead.goal] : undefined}</Field>
          <Field label="Necesidad detectada">{lead.needs.join(" + ")}</Field>
          <Field label="Presupuesto">{lead.budget ? formatCop(lead.budget) : undefined}</Field>
          <Field label="Interés en IA">{lead.aiInterest ? `Sí${lead.aiLevel === "advanced" ? " · avanzada" : lead.aiLevel === "basic" ? " · básica" : ""}` : "No"}</Field>
          <Field label="Plan recomendado">{planName ? recommendationLabel({ recommendedPlan: lead.recommendedPlan }) : undefined}</Field>
          <Field label="Jeipy AI recomendado">{lead.recommendedAi ? getAiTier(lead.recommendedAi).name : undefined}</Field>
          <Field label="Intención">{lead.intent === "callback" ? "Solicita una llamada" : "Quiere una cotización"}</Field>
        </dl>
      </Panel>

      <Panel title="Notas internas e historial">
        <NoteForm leadId={lead.id} />
        <div className="mt-5">
          <Activity notes={notes} />
        </div>
      </Panel>

      {lead.transcript?.length ? (
        <details className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
          <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-[0.18em] text-mist">
            Conversación con Jeipy AI ({lead.transcript.length} mensajes)
          </summary>
          <ol className="mt-3 space-y-2 text-sm">
            {lead.transcript.map((m, i) => (
              <li key={i} className={m.role === "user" ? "text-snow" : "text-mist"}>
                <span className="font-medium">{m.role === "user" ? "Cliente" : "Jeipy AI"}:</span> <span className="whitespace-pre-wrap">{m.text}</span>
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </div>
  );
}
