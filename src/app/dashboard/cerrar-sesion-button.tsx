"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { apiFetch } from "@/lib/api";

export default function CerrarSesionButton() {
  const router = useRouter();

  async function cerrarSesion() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={cerrarSesion}
      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
    >
      <LogOut className="h-4 w-4" aria-hidden />
      Cerrar sesión
    </button>
  );
}
