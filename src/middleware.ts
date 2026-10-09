import { NextRequest, NextResponse } from "next/server";

// IMPORTANTE — modelo de seguridad tras la separación frontend/backend:
// este middleware es solo UX (evita el parpadeo de una página protegida y
// redirige antes de renderizar). La barrera de seguridad REAL vive en el
// backend: cada endpoint exige `requerirSesion*`/`requerirRol` con su
// propia verificación del JWT (ver backend/src/lib/tenant.ts). Aunque este
// middleware fallara o se saltara por completo, ningún dato sensible se
// filtra, porque las páginas del dashboard obtienen sus datos llamando al
// backend con la cookie de sesión — si no es válida, el backend responde
// 401/403 y la página no tiene nada que mostrar.
//
// El frontend NO conoce JWT_SECRET: en vez de verificar el token aquí, le
// pregunta al backend quién es el usuario. Así el secreto vive en un solo
// lugar, y un usuario desactivado o con el rol cambiado se refleja de
// inmediato (el backend relee su estado en cada petición). El costo es una
// llamada a /api/auth/me por navegación protegida.
export const config = {
  matcher: ["/dashboard/:path*", "/superadmin/:path*"],
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const SESSION_COOKIE_NAME = "microdigital_session";

type Rol = "SUPERADMIN" | "ADMINISTRADOR" | "VENDEDOR";

async function rolDeLaSesion(token: string): Promise<Rol | null> {
  try {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { usuario?: { rol?: Rol } };
    return data.usuario?.rol ?? null;
  } catch {
    // Backend caído: se trata como sin sesión. Sin backend la página
    // tampoco podría cargar sus datos.
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const rol = token ? await rolDeLaSesion(token) : null;

  if (!rol) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (req.nextUrl.pathname.startsWith("/superadmin") && rol !== "SUPERADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  if (req.nextUrl.pathname.startsWith("/dashboard") && rol === "SUPERADMIN") {
    return NextResponse.redirect(new URL("/superadmin", req.url));
  }

  return NextResponse.next();
}
