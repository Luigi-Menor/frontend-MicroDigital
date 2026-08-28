"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Store } from "lucide-react";
import GoogleSignInButton from "@/app/components/GoogleSignInButton";
import { apiFetch } from "@/lib/api";
import { Button, TextField, Alert } from "@/app/components/ui";

export default function RegistroPage() {
  const router = useRouter();
  // Si el registro es con Google, guardamos aquí el credential verificable;
  // el nombre/correo mostrados abajo son solo para que el usuario confirme
  // visualmente (decodificados en el cliente, SIN validar firma — la
  // verificación real ocurre en el servidor al enviar el formulario).
  const [credentialGoogle, setCredentialGoogle] = useState<string | null>(null);
  const [perfilGooglePreview, setPerfilGooglePreview] = useState<{ nombre: string; email: string } | null>(null);

  const [form, setForm] = useState({
    nombreNegocio: "",
    tipoNegocio: "",
    contacto: "",
    nombreAdmin: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  function actualizar(campo: keyof typeof form, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function onGoogleCredential(credential: string) {
    setError(null);
    setCredentialGoogle(credential);
    try {
      // Solo para prellenar la UI — no es una verificación de seguridad.
      const payloadBase64 = credential.split(".")[1];
      if (!payloadBase64) throw new Error("Token con formato inesperado");
      const payload = JSON.parse(atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/")));
      setPerfilGooglePreview({ nombre: payload.name ?? "", email: payload.email ?? "" });
    } catch {
      setPerfilGooglePreview(null);
    }
  }

  async function onSubmitClasico(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const res = await apiFetch("/api/auth/registro", {
        method: "POST",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo registrar el negocio");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setCargando(false);
    }
  }

  async function onSubmitGoogle(e: FormEvent) {
    e.preventDefault();
    if (!credentialGoogle) return;
    setError(null);
    setCargando(true);
    try {
      const res = await apiFetch("/api/auth/google/registro", {
        method: "POST",
        body: JSON.stringify({
          credential: credentialGoogle,
          nombreNegocio: form.nombreNegocio,
          tipoNegocio: form.tipoNegocio,
          contacto: form.contacto,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.codigo === "CUENTA_YA_EXISTE"
            ? "Ya existe una cuenta con este correo de Google. Inicia sesión en vez de registrarte."
            : data.error ?? "No se pudo registrar el negocio"
        );
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-dark text-white">
            <Store className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="font-display text-2xl font-bold text-brand-dark">Registra tu negocio</h1>
          <p className="mt-1 text-sm text-slate-500">Crea tu cuenta de Administrador</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-card">
          {credentialGoogle && perfilGooglePreview ? (
            // Paso 2 del flujo con Google: identidad ya confirmada, solo
            // faltan los datos del negocio (Google no los conoce).
            <form onSubmit={onSubmitGoogle} className="space-y-4">
              <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                Continuando como <strong>{perfilGooglePreview.nombre}</strong> ({perfilGooglePreview.email})
                <button
                  type="button"
                  onClick={() => {
                    setCredentialGoogle(null);
                    setPerfilGooglePreview(null);
                  }}
                  className="ml-2 text-xs font-medium text-brand-dark underline underline-offset-2"
                >
                  cambiar
                </button>
              </div>
              <TextField label="Nombre del negocio" required value={form.nombreNegocio} onChange={(e) => actualizar("nombreNegocio", e.target.value)} />
              <TextField label="Tipo de negocio" required placeholder="Tienda, peluquería, restaurante..." value={form.tipoNegocio} onChange={(e) => actualizar("tipoNegocio", e.target.value)} />
              <TextField label="Contacto (teléfono)" required value={form.contacto} onChange={(e) => actualizar("contacto", e.target.value)} />

              {error && <Alert>{error}</Alert>}

              <Button type="submit" cargando={cargando} className="w-full">
                {cargando ? "Creando negocio..." : "Crear negocio con Google"}
              </Button>
            </form>
          ) : (
            <>
              <div className="mb-5">
                <GoogleSignInButton onCredential={onGoogleCredential} texto="signup_with" />
              </div>
              <div className="mb-5 flex items-center gap-3 text-xs text-slate-400">
                <div className="h-px flex-1 bg-slate-200" />
                o con correo y contraseña
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <form onSubmit={onSubmitClasico} className="space-y-4">
                <TextField label="Nombre del negocio" required value={form.nombreNegocio} onChange={(e) => actualizar("nombreNegocio", e.target.value)} />
                <TextField label="Tipo de negocio" required placeholder="Tienda, peluquería, restaurante..." value={form.tipoNegocio} onChange={(e) => actualizar("tipoNegocio", e.target.value)} />
                <TextField label="Contacto (teléfono)" required value={form.contacto} onChange={(e) => actualizar("contacto", e.target.value)} />
                <TextField label="Tu nombre (Administrador)" required value={form.nombreAdmin} onChange={(e) => actualizar("nombreAdmin", e.target.value)} />
                <TextField label="Correo" type="email" autoComplete="email" required value={form.email} onChange={(e) => actualizar("email", e.target.value)} />
                <TextField label="Contraseña" type="password" autoComplete="new-password" required value={form.password} onChange={(e) => actualizar("password", e.target.value)} />

                {error && <Alert>{error}</Alert>}

                <Button type="submit" cargando={cargando} className="w-full">
                  {cargando ? "Creando negocio..." : "Crear negocio"}
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="mt-5 text-center text-sm text-slate-500">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-medium text-brand-dark underline underline-offset-2">
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
