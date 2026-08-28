"use client";

import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

const CAMPO_BASE =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50 disabled:text-slate-400";

function Etiqueta({ id, texto, requerido }: { id: string; texto: string; requerido?: boolean }) {
  return (
    <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
      {texto}
      {requerido && <span className="text-brand-500"> *</span>}
    </label>
  );
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

// Input con label asociado (accesibilidad: `label for=`), estado de error y
// texto de ayuda opcional. Es el bloque con el que se arma todo formulario.
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, hint, id, required, className, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    return (
      <div>
        <Etiqueta id={inputId} texto={label} requerido={required} />
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={!!error}
          className={cn(CAMPO_BASE, error && "border-danger-600 focus:border-danger-600 focus:ring-danger-100", className)}
          {...props}
        />
        {error ? (
          <p className="mt-1 text-xs text-danger-600">{error}</p>
        ) : hint ? (
          <p className="mt-1 text-xs text-slate-400">{hint}</p>
        ) : null}
      </div>
    );
  }
);
TextField.displayName = "TextField";

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, error, hint, id, required, className, children, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    return (
      <div>
        <Etiqueta id={inputId} texto={label} requerido={required} />
        <select
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={!!error}
          className={cn(CAMPO_BASE, "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2364748b%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[position:right_0.75rem_center] bg-no-repeat pr-9", error && "border-danger-600 focus:border-danger-600 focus:ring-danger-100", className)}
          {...props}
        >
          {children}
        </select>
        {error ? (
          <p className="mt-1 text-xs text-danger-600">{error}</p>
        ) : hint ? (
          <p className="mt-1 text-xs text-slate-400">{hint}</p>
        ) : null}
      </div>
    );
  }
);
SelectField.displayName = "SelectField";

interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  ({ label, error, hint, id, required, className, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    return (
      <div>
        <Etiqueta id={inputId} texto={label} requerido={required} />
        <textarea
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={!!error}
          className={cn(CAMPO_BASE, "min-h-[5.5rem] resize-y", error && "border-danger-600 focus:border-danger-600 focus:ring-danger-100", className)}
          {...props}
        />
        {error ? (
          <p className="mt-1 text-xs text-danger-600">{error}</p>
        ) : hint ? (
          <p className="mt-1 text-xs text-slate-400">{hint}</p>
        ) : null}
      </div>
    );
  }
);
TextareaField.displayName = "TextareaField";
