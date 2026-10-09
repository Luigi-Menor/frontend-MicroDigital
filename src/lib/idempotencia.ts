import { useCallback, useRef } from "react";
import { apiFetch } from "./api";

/**
 * POST con `Idempotency-Key` para operaciones que mueven dinero o inventario
 * (ventas, abonos, compras, pagos a proveedores). El backend deduplica por esa
 * clave (backend/src/lib/idempotencia.ts), así que reintentar con la MISMA
 * clave nunca repite el efecto.
 *
 * Regla de vida de la clave:
 *  - Si el servidor respondió (2xx, 4xx o 5xx), la operación terminó y se
 *    descarta la clave: el siguiente envío es una operación nueva. Esto
 *    importa porque el backend guarda también las respuestas 4xx; reutilizar
 *    la clave tras corregir un error devolvería el error viejo.
 *  - Si `fetch` lanzó (red caída, timeout), NO se sabe si el servidor llegó a
 *    aplicar la operación: se conserva la clave para que el reintento del
 *    usuario quede deduplicado en vez de duplicar la venta.
 *  - La clave conservada solo se reutiliza si el reintento es EXACTAMENTE la
 *    misma petición (misma ruta y mismo cuerpo). Si el usuario cambió algo
 *    (otro cliente, otro carrito), es una operación distinta y lleva clave
 *    nueva; si no, el servidor respondería con el resultado de la anterior y
 *    la nueva nunca se registraría.
 */
export function usePostIdempotente() {
  const pendienteRef = useRef<{ clave: string; firma: string } | null>(null);

  return useCallback(async (path: string, body?: unknown): Promise<Response> => {
    const cuerpo = body === undefined ? undefined : JSON.stringify(body);
    const firma = `${path}\n${cuerpo ?? ""}`;
    if (pendienteRef.current?.firma !== firma) {
      pendienteRef.current = { clave: crypto.randomUUID(), firma };
    }
    const res = await apiFetch(path, {
      method: "POST",
      headers: { "Idempotency-Key": pendienteRef.current.clave },
      body: cuerpo,
    });
    pendienteRef.current = null;
    return res;
  }, []);
}

export const MENSAJE_ERROR_RED =
  "No hubo respuesta del servidor. Revisa tu conexión e inténtalo de nuevo: si la operación ya se había registrado, no se duplicará.";
