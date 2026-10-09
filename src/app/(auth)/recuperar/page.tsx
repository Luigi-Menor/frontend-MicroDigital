"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button, TextField, Alert } from "@/app/components/ui";

// RF-007 — Solicitar el enlace de recuperación. La respuesta del backend es la
// misma exista o no el correo, y aquí se muestra igual para no revelarlo.
export default function RecuperarPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMensaje(null);
    setCargando(true);
    try {
      const res = await apiFetch("/api/auth/recuperar", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo enviar el enlace");
      setMensaje(data.mensaje);
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

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-dark text-white">
            <KeyRound className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="font-display text-2xl font-bold text-brand-dark">Recuperar contraseña</h1>
          <p className="mt-1 text-sm text-slate-500">
            Te enviaremos un enlace para crear una contraseña nueva
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-card">
          {mensaje ? (
            <div className="space-y-4">
              <Alert tono="success">{mensaje}</Alert>
              <p className="text-sm text-slate-500">
                Revisa tu bandeja de entrada y la carpeta de correo no deseado.
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <TextField
                label="Correo electrónico"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {error && <Alert>{error}</Alert>}
              <Button type="submit" cargando={cargando} className="w-full">
                {cargando ? "Enviando..." : "Enviar enlace"}
              </Button>
            </form>
          )}
        </div>

        <p className="mt-5 text-center text-sm text-slate-500">
          <Link href="/login" className="font-medium text-brand-dark underline underline-offset-2">
            Volver a iniciar sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
