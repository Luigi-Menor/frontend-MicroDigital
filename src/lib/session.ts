import { jwtVerify } from "jose";

// El frontend NUNCA firma sesiones (no hay firmarSesion aquí a propósito):
// solo el backend emite el JWT al hacer login/registro. Este módulo existe
// solo para que el middleware pueda decidir si redirige a /login sin tener
// que llamar al backend en cada navegación — es una verificación de UX, NO
// el control de acceso real (ese vive en cada endpoint del backend).
const secretKey = new TextEncoder().encode(
  process.env.JWT_SECRET || (() => {
    throw new Error("JWT_SECRET environment variable is required");
  })()
);

export interface SesionPayload {
  usuarioId: string;
  negocioId: string | null;
  rol: "SUPERADMIN" | "ADMINISTRADOR" | "VENDEDOR";
  email: string;
}

export async function verificarSesion(token: string): Promise<SesionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as SesionPayload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = "microdigital_session";
