"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingCart, Wallet, HandCoins, TrendingUp, AlertTriangle, Trophy } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatoMoneda } from "@/lib/format";
import { useSesion } from "./SesionContext";
import { PageHeader, StatTile, Card, CardHeader, CardBody, Skeleton, EmptyState } from "@/app/components/ui";

interface Indicadores {
  ventasHoy: { total: number; monto?: number };
  ventasSemana: { total: number; monto?: number };
  ventasMes: { total: number; monto?: number };
  productoMasVendido: { nombre: string; unidadesVendidas: number } | null;
  balance?: { ingresosPagados: number; saldoPendienteFiados: number };
}
interface Producto {
  id: string;
  nombre: string;
  stock: number;
  stockMinimo: number;
  stockBajo: boolean;
}

export default function DashboardPage() {
  const { esAdmin } = useSesion();
  const [indicadores, setIndicadores] = useState<Indicadores | null>(null);
  const [alertaStock, setAlertaStock] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    // RF-013: /api/dashboard ya calcula ventas por período y oculta montos al
    // Vendedor; /api/productos trae el detalle para armar la alerta de
    // stock bajo (RF-008), que el endpoint de dashboard no expone.
    Promise.all([
      apiFetch("/api/dashboard").then((r) => r.json()),
      apiFetch("/api/productos").then((r) => r.json()),
    ])
      .then(([dash, prod]) => {
        setIndicadores(dash);
        setAlertaStock((prod.productos ?? []).filter((p: Producto) => p.stockBajo));
      })
      .finally(() => setCargando(false));
  }, []);

  return (
    <div>
      <PageHeader title="Panel" description="Resumen del negocio en tiempo real" />

      {cargando ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Ventas de hoy"
              value={String(indicadores?.ventasHoy.total ?? 0)}
              icon={ShoppingCart}
            />
            <StatTile
              label="Ventas del mes"
              value={String(indicadores?.ventasMes.total ?? 0)}
              icon={TrendingUp}
            />
            {esAdmin && (
              <StatTile
                label="Vendido hoy"
                value={formatoMoneda(indicadores?.ventasHoy.monto)}
                icon={Wallet}
              />
            )}
            {esAdmin && indicadores?.balance && (
              <StatTile
                label="Cartera pendiente (fiados)"
                value={formatoMoneda(indicadores.balance.saldoPendienteFiados)}
                icon={HandCoins}
                alerta={Number(indicadores.balance.saldoPendienteFiados) > 0}
              />
            )}
            <StatTile
              label="Productos con stock bajo"
              value={String(alertaStock.length)}
              icon={AlertTriangle}
              alerta={alertaStock.length > 0}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader title="Alerta de stock bajo" description="Productos en o por debajo de su mínimo configurado" />
              <CardBody>
                {alertaStock.length === 0 ? (
                  <EmptyState title="Todo el inventario está en orden" description="Ningún producto está por debajo de su stock mínimo." />
                ) : (
                  <ul className="space-y-2">
                    {alertaStock.map((p) => (
                      <li key={p.id} className="flex items-center justify-between rounded-lg bg-warning-50 px-3 py-2 text-sm">
                        <span className="font-medium text-warning-700">{p.nombre}</span>
                        <span className="text-warning-700">
                          quedan <span className="tabular-nums">{p.stock}</span> (mín. {p.stockMinimo})
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <Link href="/dashboard/inventario" className="mt-3 inline-block text-sm font-medium text-brand-dark underline underline-offset-2">
                  Ver inventario completo
                </Link>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Producto más vendido" description="Histórico acumulado del negocio" />
              <CardBody>
                {indicadores?.productoMasVendido ? (
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                      <Trophy className="h-5 w-5" aria-hidden />
                    </span>
                    <div>
                      <p className="font-display text-base font-semibold text-slate-900">
                        {indicadores.productoMasVendido.nombre}
                      </p>
                      <p className="text-sm text-slate-500">
                        {indicadores.productoMasVendido.unidadesVendidas} unidades vendidas
                      </p>
                    </div>
                  </div>
                ) : (
                  <EmptyState title="Aún no hay ventas suficientes" description="Cuando registres ventas, aquí verás tu producto estrella." />
                )}
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
