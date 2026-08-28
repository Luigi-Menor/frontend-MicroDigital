import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export function StatTile({
  label,
  value,
  icon: Icon,
  alerta = false,
  hint,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  alerta?: boolean;
  hint?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-5 shadow-card",
        alerta ? "border-warning-100 bg-warning-50" : "border-slate-200 bg-white"
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{label}</p>
        {Icon && (
          <span
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              alerta ? "bg-warning-100 text-warning-700" : "bg-brand-50 text-brand-600"
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        )}
      </div>
      <p className="mt-2 font-display text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
