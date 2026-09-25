import Link from "next/link";
import { requireAdmin } from "@/server/admin/auth";
import { configurationChecks, fallbackSummary } from "@/server/leads/status";
import { storeHealth, storeWriteCheck } from "@/server/leads/store";
import { TestButtons } from "./TestButtons";

/** Datos privados y en vivo: nunca se prerenderiza ni se cachea. */
export const dynamic = "force-dynamic";

export const metadata = { title: "Estado del sistema" };

function Row({ ok, label, detail, tone }: { ok: boolean; label: string; detail: string; tone?: "required" | "recommended" | "optional" }) {
  return (
    <li className="flex gap-3 py-3">
      <span
        aria-hidden
        className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
          ok ? "bg-[#34d399]/20 text-[#6ee7b7]" : tone === "optional" ? "bg-white/10 text-mist" : "bg-[#ffb547]/20 text-[#ffc97a]"
        }`}
      >
        {ok ? "✓" : "!"}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-snow">
          {label}
          {tone && tone !== "required" && <span className="ml-2 text-xs font-normal text-mist">({tone === "recommended" ? "recomendado" : "opcional"})</span>}
        </p>
        <p className="text-sm text-mist">{detail}</p>
      </div>
    </li>
  );
}

export default async function SystemPage() {
  await requireAdmin();
  const [read, write] = await Promise.all([storeHealth(), storeWriteCheck()]);
  const checks = configurationChecks();
  const fallback = fallbackSummary();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/admin/leads" className="text-sm text-glow hover:underline">
        ← Volver a la bandeja
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-[-0.02em]">Estado del sistema</h1>
      <p className="mt-1 text-sm text-mist">Comprobación en vivo. Nunca muestra valores secretos.</p>

      <section className="mt-6 rounded-2xl border border-line bg-surface px-5 py-2">
        <ul className="divide-y divide-line">
          <Row ok label="Backend" detail="El servidor responde." />
          <Row ok={read.ok} label="Supabase · lectura" detail={read.ok ? "Conexión y tablas correctas." : read.reason} />
          <Row ok={write.ok} label="Supabase · escritura" detail={write.ok ? `Escritura de prueba no destructiva correcta (${write.latencyMs} ms).` : write.reason} />
          <Row
            ok={fallback.operational}
            label="Respaldo si Supabase falla"
            detail={
              fallback.operational
                ? `Operativo por ${[fallback.email && "correo (Resend)", fallback.webhook && "webhook"].filter(Boolean).join(" y ")}. Usa los botones de abajo para comprobarlo de verdad.`
                : "NO operativo: si Supabase falla, el lead solo queda guardado en el navegador del cliente. Configura Resend y/o un webhook de respaldo."
            }
          />
          <Row ok={fallback.recentPersistenceFailures === 0} label="Fallas recientes de guardado" detail={`${fallback.recentPersistenceFailures} en los últimos 15 minutos (en esta instancia del servidor).`} />
        </ul>
      </section>

      <h2 className="mt-8 text-sm font-medium text-snow">Probar los canales de respaldo (envío real)</h2>
      <div className="mt-3">
        <TestButtons />
      </div>

      <h2 className="mt-8 text-sm font-medium text-snow">Configuración</h2>
      <section className="mt-3 rounded-2xl border border-line bg-surface px-5 py-2">
        <ul className="divide-y divide-line">
          {checks.map((c) => (
            <Row key={c.id} ok={c.ok} label={c.label} detail={c.detail} tone={c.level} />
          ))}
        </ul>
      </section>
    </main>
  );
}
