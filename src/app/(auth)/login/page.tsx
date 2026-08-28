"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Store } from "lucide-react";
import GoogleSignInButton from "@/app/components/GoogleSignInButton";
import { apiFetch } from "@/lib/api";
import { Button, TextField, Alert } from "@/app/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function iniciarConGoogle(credential: string) {
    setError(null);
    setCargando(true);
    try {
      const res = await apiFetch("/api/auth/google/login", {
        method: "POST",
        body: JSON.stringify({ credential }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.codigo === "CUENTA_NO_EXISTE"
            ? "No existe una cuenta con este correo de Google. Regístrala primero."
            : data.error ?? "No se pudo iniciar sesión con Google"
        );
      }
      router.push(data.redirigirA ?? "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setCargando(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo iniciar sesión");
      router.push(data.redirigirA ?? "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-dark text-white">
            <Store className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="font-display text-2xl font-bold text-brand-dark">MicroDigital</h1>
          <p className="mt-1 text-sm text-slate-500">Ingresa a tu negocio</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-card">
          <div className="mb-5">
            <GoogleSignInButton onCredential={iniciarConGoogle} texto="signin_with" />
          </div>
          <div className="mb-5 flex items-center gap-3 text-xs text-slate-400">
            <div className="h-px flex-1 bg-slate-200" />
            o con tu correo
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <TextField
              label="Correo electrónico"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              label="Contraseña"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && <Alert>{error}</Alert>}

            <Button type="submit" cargando={cargando} className="w-full">
              {cargando ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-slate-500">
          ¿Tienes un negocio nuevo?{" "}
          <Link href="/registro" className="font-medium text-brand-dark underline underline-offset-2">
            Regístralo aquí
          </Link>
        </p>
      </div>
    </main>
  );
}
