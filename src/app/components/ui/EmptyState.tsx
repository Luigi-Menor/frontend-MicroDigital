import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      {Icon && (
        <span className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      )}
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {description && <p className="max-w-sm text-xs text-slate-400">{description}</p>}
      {action}
    </div>
  );
}
