const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/**
 * Wrapper de fetch para llamar al backend. `credentials: "include"` es
 * obligatorio: backend y frontend son orígenes distintos, así que sin esto
 * el navegador nunca adjunta la cookie httpOnly de sesión en la petición.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}
