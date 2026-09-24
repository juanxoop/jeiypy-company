"use client";

import { useActionState } from "react";
import { login, type FormState } from "../actions";

export function LoginForm({ disabled }: { disabled: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(login, {});
  return (
    <form action={action} className="mt-8 space-y-4">
      <label className="block">
        <span className="text-sm text-mist">Contraseña del equipo</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          disabled={disabled || pending}
          className="mt-2 h-12 w-full rounded-xl border border-line-strong bg-white/[0.03] px-4 text-snow outline-none focus:border-glow/50"
        />
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-[#ff8a8a]">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={disabled || pending}
        className="h-12 w-full rounded-full bg-jeipy font-medium text-white transition-colors hover:bg-[#2a76ff] disabled:opacity-50"
      >
        {pending ? "Verificando…" : "Entrar"}
      </button>
    </form>
  );
}
