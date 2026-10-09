"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ComponentType } from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  HandCoins,
  Boxes,
  Truck,
  ShoppingBag,
  Receipt,
  FileText,
  BarChart3,
  UserCog,
  Menu,
  X,
} from "lucide-react";
import { SesionProvider, useSesion } from "./SesionContext";
import CerrarSesionButton from "./cerrar-sesion-button";

interface NavItem {
  href: string;
  etiqueta: string;
  icono: ComponentType<{ className?: string }>;
  soloAdmin?: boolean;
}

interface NavGrupo {
  titulo: string;
  items: NavItem[];
}

const NAV: NavGrupo[] = [
  {
    titulo: "Operación",
    items: [
      { href: "/dashboard", etiqueta: "Panel", icono: LayoutDashboard },
      { href: "/dashboard/ventas", etiqueta: "Ventas", icono: ShoppingCart },
      { href: "/dashboard/productos", etiqueta: "Productos", icono: Package },
      { href: "/dashboard/clientes", etiqueta: "Clientes", icono: Users },
      { href: "/dashboard/fiados", etiqueta: "Fiados", icono: HandCoins },
      { href: "/dashboard/inventario", etiqueta: "Inventario", icono: Boxes },
    ],
  },
  {
    titulo: "Compras y gastos",
    items: [
      { href: "/dashboard/proveedores", etiqueta: "Proveedores", icono: Truck },
      { href: "/dashboard/compras", etiqueta: "Compras", icono: ShoppingBag },
      { href: "/dashboard/gastos", etiqueta: "Gastos", icono: Receipt },
      { href: "/dashboard/comprobantes", etiqueta: "Comprobantes", icono: FileText },
    ],
  },
  {
    titulo: "Gestión",
    items: [
      { href: "/dashboard/estadisticas", etiqueta: "Estadísticas", icono: BarChart3 },
      { href: "/dashboard/usuarios", etiqueta: "Usuarios", icono: UserCog, soloAdmin: true },
    ],
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SesionProvider>
      <DashboardShell>{children}</DashboardShell>
    </SesionProvider>
  );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { sesion, esAdmin } = useSesion();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const pathname = usePathname();

  const nombreNegocio = sesion?.negocio?.nombre ?? "MicroDigital";

  return (
    <div className="min-h-screen md:flex">
      {/* Barra superior: solo en móvil, da acceso al menú lateral. */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <span className="font-display text-base font-bold text-brand-dark">{nombreNegocio}</span>
        <button
          onClick={() => setMenuAbierto(true)}
          aria-label="Abrir menú"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
      </header>

      {menuAbierto && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button aria-label="Cerrar menú" onClick={() => setMenuAbierto(false)} className="absolute inset-0 bg-slate-900/40" />
          <div className="relative flex h-full w-72 flex-col bg-white px-4 py-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-display text-base font-bold text-brand-dark">{nombreNegocio}</span>
              <button onClick={() => setMenuAbierto(false)} aria-label="Cerrar menú" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <SidebarContent pathname={pathname} esAdmin={esAdmin} rol={sesion?.usuario.rol} onNavigate={() => setMenuAbierto(false)} />
          </div>
        </div>
      )}

      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white px-4 py-6 md:flex md:flex-col">
        <div className="mb-6 px-2">
          <h2 className="font-display text-lg font-bold text-brand-dark">{nombreNegocio}</h2>
          <p className="text-xs uppercase tracking-wide text-slate-400">{sesion?.usuario.rol ?? "…"}</p>
        </div>
        <SidebarContent pathname={pathname} esAdmin={esAdmin} rol={sesion?.usuario.rol} />
      </aside>

      <main className="min-w-0 flex-1 bg-slate-50 p-4 sm:p-6 md:p-8">{children}</main>
    </div>
  );
}

function SidebarContent({
  pathname,
  esAdmin,
  rol,
  onNavigate,
}: {
  pathname: string;
  esAdmin: boolean;
  rol?: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      <nav className="flex-1 space-y-5 overflow-y-auto text-sm">
        {NAV.map((grupo) => {
          const items = grupo.items.filter((item) => !item.soloAdmin || esAdmin);
          if (items.length === 0) return null;
          return (
            <div key={grupo.titulo}>
              <p className="mb-1.5 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{grupo.titulo}</p>
              <div className="space-y-0.5">
                {items.map((item) => (
                  <NavLink key={item.href} item={item} activo={esActivo(pathname, item.href)} onNavigate={onNavigate} />
                ))}
              </div>
            </div>
          );
        })}
      </nav>
      <div className="mt-6 border-t border-slate-100 pt-4">
        {!rol && <p className="px-3 pb-2 text-xs text-slate-400">Cargando sesión…</p>}
        <CerrarSesionButton />
      </div>
    </>
  );
}

function esActivo(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

function NavLink({ item, activo, onNavigate }: { item: NavItem; activo: boolean; onNavigate?: () => void }) {
  const Icono = item.icono;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 font-medium transition-colors ${
        activo ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      <Icono className="h-4 w-4 shrink-0" />
      {item.etiqueta}
    </Link>
  );
}
