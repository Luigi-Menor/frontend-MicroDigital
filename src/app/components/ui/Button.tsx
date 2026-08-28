"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Variante = "primary" | "accent" | "secondary" | "ghost" | "danger";
type Tamano = "sm" | "md" | "icon";

const VARIANTES: Record<Variante, string> = {
  primary: "bg-brand-dark text-white hover:bg-brand-darkLight active:bg-brand-900 disabled:bg-brand-dark/60",
  accent: "bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 disabled:bg-brand-500/60",
  secondary: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100",
  ghost: "text-slate-600 hover:bg-slate-100 active:bg-slate-200",
  danger: "bg-danger-600 text-white hover:bg-danger-700 active:bg-danger-700/90 disabled:bg-danger-600/60",
};

const TAMANOS: Record<Tamano, string> = {
  sm: "h-9 gap-1.5 rounded-lg px-3 text-sm",
  md: "h-11 gap-2 rounded-lg px-4 text-sm",
  icon: "h-10 w-10 rounded-lg",
};

interface BotonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  tamano?: Tamano;
  cargando?: boolean;
}

// Botón base de toda la app: primary (navy) es la acción principal de cada
// pantalla, accent (naranja de marca) resalta la acción "crear" cuando
// conviene destacarla del resto (p. ej. "Nueva venta"), secondary/ghost/danger
// cubren el resto de casos.
export const Button = forwardRef<HTMLButtonElement, BotonProps>(
  ({ variante = "primary", tamano = "md", cargando = false, disabled, className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || cargando}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed",
          VARIANTES[variante],
          TAMANOS[tamano],
          className
        )}
        {...props}
      >
        {cargando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
