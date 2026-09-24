"use client";

import { useActionState, useEffect, useRef } from "react";
import { addNote, type FormState } from "../../actions";

export function NoteForm({ leadId }: { leadId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addNote, {});
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);
  return (
    <form ref={formRef} action={action} className="space-y-2">
      <input type="hidden" name="id" value={leadId} />
      <label htmlFor="note" className="sr-only">
        Nueva nota interna
      </label>
      <textarea
        id="note"
        name="body"
        rows={3}
        maxLength={4000}
        placeholder="Ej.: Lo llamé el martes, quiere empezar en enero…"
        className="w-full rounded-xl border border-line-strong bg-white/[0.03] p-3 text-sm text-snow outline-none placeholder:text-mist/60 focus:border-glow/50"
      />
      {state.error && <p className="text-sm text-[#ff8a8a]">{state.error}</p>}
      <button type="submit" disabled={pending} className="h-10 rounded-full bg-jeipy px-4 text-sm font-medium text-white hover:bg-[#2a76ff] disabled:opacity-50">
        {pending ? "Guardando…" : "Agregar nota"}
      </button>
    </form>
  );
}
