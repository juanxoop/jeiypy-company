import { redirect } from "next/navigation";
import { isAdmin, isAdminConfigured } from "@/server/admin/auth";
import { LoginForm } from "./LoginForm";

/** Datos privados y por usuario: nunca se prerenderiza ni se cachea. */
export const dynamic = "force-dynamic";


export const metadata = { title: "Acceso del equipo" };

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect("/admin/leads");
  const configured = isAdminConfigured();
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-sm rounded-3xl border border-line bg-surface p-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-glow">Jeipy Company</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.02em]">Bandeja de solicitudes</h1>
        <p className="mt-2 text-sm text-mist">Acceso privado del equipo.</p>
        {!configured && (
          <p className="mt-6 rounded-xl border border-line-strong bg-white/[0.03] p-4 text-sm text-mist">
            El acceso aún no está configurado. Define <code className="text-snow">ADMIN_PASSWORD</code> (mínimo 10 caracteres) y{" "}
            <code className="text-snow">ADMIN_SESSION_SECRET</code> (mínimo 32 caracteres) en las variables de entorno.
          </p>
        )}
        <LoginForm disabled={!configured} />
      </div>
    </main>
  );
}
