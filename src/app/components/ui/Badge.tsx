import { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tono = "neutral" | "success" | "warning" | "danger" | "info" | "brand";

const TONOS: Record<Tono, string> = {
  neutral: "bg-slate-100 text-slate-700",
  success: "bg-success-100 text-success-700",
  warning: "bg-warning-100 text-warning-700",
  danger: "bg-danger-100 text-danger-700",
  info: "bg-info-100 text-info-700",
  brand: "bg-brand-100 text-brand-700",
};

export function Badge({ tono = "neutral", children }: { tono?: Tono; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", TONOS[tono])}>
      {children}
    </span>
  );
}
