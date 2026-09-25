"use client";

import { useActionState } from "react";
import { testBackupEmail, testBackupWebhook, type TestState } from "./actions";

function TestButton({ label, action }: { label: string; action: () => Promise<TestState> }) {
  const [state, run, pending] = useActionState<TestState>(action, {});
  return (
    <form action={run} className="rounded-2xl border border-line bg-surface p-4">
      <button type="submit" disabled={pending} className="h-10 rounded-full bg-jeipy px-4 text-sm font-medium text-white hover:bg-[#2a76ff] disabled:opacity-50">
        {pending ? "Enviando prueba…" : label}
      </button>
      {state.message && (
        <p role="status" className={`mt-3 text-sm ${state.ok ? "text-[#6ee7b7]" : "text-[#ffb4b4]"}`}>
          {state.ok ? "✓ " : "✗ "}
          {state.message}
        </p>
      )}
    </form>
  );
}

export function TestButtons() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <TestButton label="Probar correo de respaldo" action={testBackupEmail} />
      <TestButton label="Probar webhook de respaldo" action={testBackupWebhook} />
    </div>
  );
}
