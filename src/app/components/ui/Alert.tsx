import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/cn";

type Tono = "danger" | "success" | "info" | "warning";

const ESTILOS: Record<Tono, { clase: string; icono: typeof Info }> = {
  danger: { clase: "border-danger-100 bg-danger-50 text-danger-700", icono: AlertTriangle },
  success: { clase: "border-success-100 bg-success-50 text-success-700", icono: CheckCircle2 },
  info: { clase: "border-info-100 bg-info-50 text-info-700", icono: Info },
  warning: { clase: "border-warning-100 bg-warning-50 text-warning-700", icono: AlertTriangle },
};

export function Alert({ tono = "danger", children }: { tono?: Tono; children: string }) {
  const { clase, icono: Icono } = ESTILOS[tono];
  return (
    <div className={cn("flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm", clase)} role="alert">
      <Icono className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  );
}
