/**
 * Sesión del equipo para /admin: cookie httpOnly firmada con HMAC-SHA256 (Web Crypto),
 * con vencimiento. Sin dependencias, válida en Proxy y en el servidor.
 */
export const ADMIN_COOKIE = "jeipy_admin";
export const SESSION_HOURS = 12;

const encoder = new TextEncoder();

function base64url(bytes: ArrayBuffer): string {
  return Buffer.from(bytes).toString("base64url");
}

async function sign(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64url(await crypto.subtle.sign("HMAC", key, encoder.encode(data)));
}

/** Comparación en tiempo constante para no filtrar información por tiempos de respuesta. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken(secret: string, now = Date.now()): Promise<string> {
  const payload = `v1.${now + SESSION_HOURS * 3_600_000}`;
  return `${payload}.${await sign(secret, payload)}`;
}

export async function verifySessionToken(token: string | undefined, secret: string | undefined, now = Date.now()): Promise<boolean> {
  if (!token || !secret || secret.length < 32) return false;
  const [version, expires, signature] = token.split(".");
  if (version !== "v1" || !expires || !signature) return false;
  if (!/^\d+$/.test(expires) || Number(expires) < now) return false;
  return safeEqual(signature, await sign(secret, `${version}.${expires}`));
}
