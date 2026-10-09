"use client";

import { Suspense, useState, FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button, TextField, Alert } from "@/app/components/ui";

// RF-008 — Confirmar el cambio de contraseña con el token recibido por correo.
function FormularioRestablecer() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const [cargando, setCargando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmacion) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setCargando(true);
    try {
      const res = await apiFetch("/api/auth/recuperar/confirmar", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        // 400 con detalles = contraseña que no cumple el mínimo; sin detalles =
        // enlace inválido o vencido.
        throw new Error(
          data.detalles?.fieldErrors?.password?.[0] ?? data.error ?? "No se pudo cambiar la contraseña"
        );
      }
      setListo(true);
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "No hubo respuesta del servidor. Revisa tu conexión e inténtalo de nuevo."
          : err instanceof Error
            ? err.message
            : "Error inesperado"
      );
    } finally {
      setCargando(false);
    }
  }

  if (!token) {
    return (
      <div className="space-y-4">
        <Alert>El enlace no es válido. Solicita uno nuevo.</Alert>
        <Link
          href="/recuperar"
          className="block text-center text-sm font-medium text-brand-dark underline underline-offset-2"
        >
          Solicitar un enlace nuevo
        </Link>
      </div>
    );
  }

  if (listo) {
    return (
      <div className="space-y-4">
        <Alert tono="success">Contraseña actualizada correctamente.</Alert>
        <Link href="/login" className="block">
          <Button className="w-full">Ir a iniciar sesión</Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <TextField
        label="Contraseña nueva"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        hint="Mínimo 8 caracteres"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <TextField
        label="Repite la contraseña"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        value={confirmacion}
        onChange={(e) => setConfirmacion(e.target.value)}
      />
      {error && <Alert>{error}</Alert>}
      <Button type="submit" cargando={cargando} className="w-full">
        {cargando ? "Guardando..." : "Cambiar contraseña"}
      </Button>
      <Link
        href="/recuperar"
        className="block text-center text-sm text-slate-500 underline underline-offset-2"
      >
        ¿El enlace venció? Pide uno nuevo
      </Link>
    </form>
  );
}

export default function RestablecerPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-dark text-white">
            <LockKeyhole className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="font-display text-2xl font-bold text-brand-dark">Nueva contraseña</h1>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-card">
          {/* useSearchParams exige Suspense en una página que se prerenderiza. */}
          <Suspense fallback={<p className="text-sm text-slate-500">Cargando…</p>}>
            <FormularioRestablecer />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
