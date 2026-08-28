import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-slate-100", className)} />;
}

export function TableSkeleton({ filas = 4, columnas = 4 }: { filas?: number; columnas?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
      <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: filas }).map((_, fila) => (
          <div key={fila} className="flex gap-4 px-4 py-3.5">
            {Array.from({ length: columnas }).map((__, col) => (
              <Skeleton key={col} className="h-3 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
