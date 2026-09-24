"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { LEAD_STATUSES, type LeadStatus } from "@/features/leads/types";
import { adminConfig, isAdminConfigured, passwordMatches, requireAdmin } from "@/server/admin/auth";
import { ADMIN_COOKIE, SESSION_HOURS, createSessionToken } from "@/server/admin/session";
import { isRateLimited } from "@/server/leads/rate-limit";
import { addLeadNote, updateLeadStatus } from "@/server/leads/store";

export type FormState = { error?: string; ok?: boolean };

export async function login(_: FormState, formData: FormData): Promise<FormState> {
  if (!isAdminConfigured()) return { error: "El acceso a la bandeja aún no está configurado (ADMIN_PASSWORD y ADMIN_SESSION_SECRET)." };
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  if (isRateLimited(`login:${ip}`)) return { error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." };

  const password = String(formData.get("password") ?? "");
  if (!passwordMatches(password)) {
    console.warn(`[admin] Intento de acceso fallido desde ${ip}`);
    return { error: "Contraseña incorrecta." };
  }
  (await cookies()).set(ADMIN_COOKIE, await createSessionToken(adminConfig.secret!), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
  redirect("/admin/leads");
}

export async function logout(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

export async function setLeadStatus(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as LeadStatus;
  if (!LEAD_STATUSES.includes(status)) throw new Error("Estado inválido.");
  await updateLeadStatus(id, status);
  // Cerrar solo cambia el estado: el lead sigue en la base de datos y en el filtro "Cerrados".
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${id}`);
}

export async function addNote(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Escribe la nota antes de guardarla." };
  if (body.length > 4000) return { error: "La nota es demasiado larga (máximo 4000 caracteres)." };
  try {
    await addLeadNote(id, body, "Equipo Jeipy");
  } catch (error) {
    console.error("[admin] No se pudo guardar la nota:", error);
    return { error: "No se pudo guardar la nota. Inténtalo de nuevo." };
  }
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${id}`);
  return { ok: true };
}
