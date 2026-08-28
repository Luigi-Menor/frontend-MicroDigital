# MicroDigital — Frontend

UI del proyecto MicroDigital. Next.js 14 (App Router) + Tailwind CSS. **No
tiene acceso a base de datos ni a ninguna dependencia de servidor de
datos** — todo se pide al backend por HTTP.

## Setup

```bash
npm install
cp .env.example .env
npm run dev     # http://localhost:3000
```

El backend debe estar corriendo (por defecto en `http://localhost:4000`)
antes de usar el frontend — ver `../backend/README.md`.

## Variables de entorno

- `NEXT_PUBLIC_API_URL` — URL del backend.
- `JWT_SECRET` — **debe ser idéntico** al del backend. Este proyecto nunca
  firma tokens, solo los verifica en `src/middleware.ts` para decidir si
  redirige a `/login` (una mejora de UX, no el control de acceso real).
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` — mismo Client ID que el backend.

## Estructura

```
src/lib/api.ts            apiFetch() — fetch con credentials:"include" hacia el backend
src/lib/session.ts        Solo verificarSesion() (jose) — nunca firma
src/middleware.ts         Redirección por UX en /dashboard y /superadmin
src/app/(auth)/login/     Login (correo/contraseña + Google)
src/app/(auth)/registro/  Registro de negocio (correo/contraseña + Google, dos pasos)
src/app/components/       GoogleSignInButton
src/app/dashboard/        Panel, productos, ventas, clientes, cerrar sesión
```

## Cómo se lee la sesión aquí

No hay Server Components leyendo la base de datos. El patrón en todo el
dashboard es:

```tsx
useEffect(() => {
  apiFetch("/api/algo").then(r => r.json()).then(setEstado);
}, []);
```

`dashboard/layout.tsx` llama a `GET /api/auth/me` en el backend para saber
el nombre del negocio y el rol del usuario en sesión; si el backend
responde 401, redirige a `/login`.

## Pendiente

- No existe todavía una página `/superadmin` (el endpoint
  `GET /api/superadmin/negocios` ya existe en el backend, falta la UI).
- Sin manejo de loading states más allá de lo básico.
