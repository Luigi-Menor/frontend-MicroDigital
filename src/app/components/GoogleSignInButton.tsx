"use client";

import { useEffect, useRef } from "react";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, string>) => void;
        };
      };
    };
  }
}

/**
 * Botón oficial de "Iniciar sesión con Google" (Google Identity Services).
 * Al completarse, entrega un ID token firmado por Google (`credential`) —
 * este componente NO decide nada de seguridad, solo transporta el token al
 * callback del padre. La verificación real ocurre en el servidor
 * (ver src/lib/google.ts) con `google-auth-library`.
 */
export default function GoogleSignInButton({
  onCredential,
  texto = "signin_with",
}: {
  onCredential: (credential: string) => void;
  texto?: "signin_with" | "signup_with" | "continue_with";
}) {
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!CLIENT_ID) return;

    function inicializar() {
      if (!window.google || !contenedorRef.current) return;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID!,
        callback: (response) => onCredential(response.credential),
      });
      window.google.accounts.id.renderButton(contenedorRef.current, {
        theme: "outline",
        size: "large",
        width: "320",
        text: texto,
        shape: "rectangular",
      });
    }

    if (window.google) {
      inicializar();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = inicializar;
    document.body.appendChild(script);

    return () => {
      script.onload = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!CLIENT_ID) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-center text-xs text-slate-400">
        Google Sign-In no está configurado (falta NEXT_PUBLIC_GOOGLE_CLIENT_ID)
      </p>
    );
  }

  return <div ref={contenedorRef} className="flex justify-center" />;
}
