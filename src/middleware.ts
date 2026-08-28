import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verificarSesion } from "@/lib/session";

// IMPORTANTE — modelo de seguridad tras la separación frontend/backend:
// este middleware es solo UX (evita el parpadeo de una página protegida y
// redirige antes de renderizar). La barrera de seguridad REAL vive en el
// backend: cada endpoint exige `requerirSesion*`/`requerirRol` con su
// propia verificación del JWT (ver backend/src/lib/tenant.ts). Aunque este
// middleware fallara o se saltara por completo, ningún dato sensible se
// filtra, porque las páginas del dashboard obtienen sus datos llamando al
// backend con la cookie de sesión — si no es válida, el backend responde
// 401/403 y la página no tiene nada que mostrar.
export const config = {
  matcher: ["/dashboard/:path*", "/superadmin/:path*"],
};

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const sesion = token ? await verificarSesion(token) : null;

  if (!sesion) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (req.nextUrl.pathname.startsWith("/superadmin") && sesion.rol !== "SUPERADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  if (req.nextUrl.pathname.startsWith("/dashboard") && sesion.rol === "SUPERADMIN") {
    return NextResponse.redirect(new URL("/superadmin", req.url));
  }

  return NextResponse.next();
}
