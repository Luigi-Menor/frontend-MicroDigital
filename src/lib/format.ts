export function formatoMoneda(valor: number | string | null | undefined): string {
  return `$${Number(valor ?? 0).toLocaleString("es-CO")}`;
}

export function formatoFecha(valor: string | Date): string {
  return new Date(valor).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatoFechaHora(valor: string | Date): string {
  return new Date(valor).toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
