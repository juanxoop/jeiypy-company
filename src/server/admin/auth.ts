import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, verifySessionToken } from "./session";

/**
 * Acceso del equipo a la bandeja. Se configura con variables de entorno del servidor:
 * ADMIN_PASSWORD (contraseña del equipo) y ADMIN_SESSION_SECRET (≥ 32 caracteres, firma las sesiones).
 */
export const adminConfig = {
  password: process.env.ADMIN_PASSWORD?.trim() || undefined,
  secret: process.env.ADMIN_SESSION_SECRET?.trim() || undefined,
};

export function isAdminConfigured(): boolean {
  return Boolean(adminConfig.password && adminConfig.password.length >= 10 && adminConfig.secret && adminConfig.secret.length >= 32);
}

export function passwordMatches(candidate: string): boolean {
  if (!adminConfig.password) return false;
  const a = createHash("sha256").update(candidate).digest();
  const b = createHash("sha256").update(adminConfig.password).digest();
  return timingSafeEqual(a, b);
}

export async function isAdmin(): Promise<boolean> {
  // Se lee la cookie siempre: así la página nunca se prerenderiza como estática.
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!isAdminConfigured()) return false;
  return verifySessionToken(token, adminConfig.secret);
}

/**
 * Capa de acceso a datos: toda página y acción de /admin la llama antes de tocar los leads.
 * El Proxy es solo una primera barrera; esta es la que protege los datos.
 */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}
