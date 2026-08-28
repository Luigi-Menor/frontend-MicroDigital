"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export interface Sesion {
  usuario: { id: string; email: string; rol: "SUPERADMIN" | "ADMINISTRADOR" | "VENDEDOR" };
  negocio: { id: string; nombre: string } | null;
}

interface SesionContextValue {
  sesion: Sesion | null;
  esAdmin: boolean;
  cargando: boolean;
}

const SesionContext = createContext<SesionContextValue>({ sesion: null, esAdmin: false, cargando: true });

// Fuente única de la sesión para todo /dashboard: antes cada página volvía a
// llamar a /api/auth/me por su cuenta (duplicado en layout.tsx y page.tsx).
// Ahora se pide una sola vez aquí y el resto de páginas la leen con
// useSesion(), incluidas las que necesitan saber si pueden mostrar acciones
// de Administrador (crear proveedor, editar usuario, etc.).
export function SesionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let mounted = true;
    apiFetch("/api/auth/me")
      .then(async (res) => {
        if (!mounted) return;
        if (!res.ok) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        if (mounted) setSesion(data);
      })
      .catch(() => {
        if (mounted) router.push("/login");
      })
      .finally(() => {
        if (mounted) setCargando(false);
      });
    return () => {
      mounted = false;
    };
  }, [router]);

  const esAdmin = sesion?.usuario.rol === "ADMINISTRADOR";
  const contextValue = useMemo(
    () => ({ sesion, esAdmin, cargando }),
    [sesion, esAdmin, cargando]
  );

  return <SesionContext.Provider value={contextValue}>{children}</SesionContext.Provider>;
}

export function useSesion(): SesionContextValue {
  return useContext(SesionContext);
}
