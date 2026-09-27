import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, sessionKey, verifySessionToken } from "@/server/admin/session";

/**
 * Primera barrera de /admin: sin una sesión válida redirige al inicio de sesión.
 * Cada página y acción vuelve a verificar la sesión antes de leer o cambiar leads.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();

  const key = sessionKey(process.env.ADMIN_SESSION_SECRET?.trim() || undefined, process.env.ADMIN_PASSWORD?.trim() || undefined);
  const valid = await verifySessionToken(request.cookies.get(ADMIN_COOKIE)?.value, key);
  if (!valid) return NextResponse.redirect(new URL("/admin/login", request.url));

  const response = NextResponse.next();
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
