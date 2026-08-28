"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { apiFetch } from "@/lib/api";
import CerrarSesionButton from "@/app/dashboard/cerrar-sesion-button";

// Sección separada de /dashboard: el Superadmin no pertenece a ningún
// negocio (ver Usuario.negocioId nulo en el backend), así que no tiene
// sentido reusar el SesionContext del dashboard (que asume `negocio`). El
// middleware ya garantiza que solo un SUPERADMIN llega aquí.
export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

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
        if (mounted) setEmail(data.usuario?.email ?? null);
      })
      .catch(() => {
        if (mounted) router.push("/login");
      });
    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-8">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-dark text-white">
            <ShieldCheck className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="font-display text-sm font-bold text-brand-dark">MicroDigital</p>
            <p className="-mt-0.5 text-xs uppercase tracking-wide text-slate-400">Superadmin</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {email && <span className="hidden text-sm text-slate-500 sm:inline">{email}</span>}
          <div className="w-40">
            <CerrarSesionButton />
          </div>
        </div>
      </header>
      <main className="p-4 sm:p-8">{children}</main>
    </div>
  );
}
