"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus, DollarSign, Percent, Wallet, HandCoins, Truck } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatoMoneda } from "@/lib/format";
import { useSesion } from "../SesionContext";
import {
  PageHeader,
  SelectField,
  Card,
  CardHeader,
  CardBody,
  StatTile,
  Badge,
  TableShell,
  Thead,
  Th,
  Tr,
  Td,
  EmptyRow,
  Skeleton,
  EmptyState,
} from "@/app/components/ui";

type Periodo = "hoy" | "ayer" | "semana" | "mes" | "anio" | "todo";

const PERIODOS: { value: Periodo; label: string }[] = [
  { value: "hoy", label: "Hoy" },
  { value: "ayer", label: "Ayer" },
  { value: "semana", label: "Esta semana" },
  { value: "mes", label: "Este mes" },
  { value: "anio", label: "Este año" },
  { value: "todo", label: "Todo" },
];

interface EstadisticasVentas {
  totalVentas: number;
  montoTotal: number;
  ticketPromedio: number;
  comparativa: { periodoAnterior: { monto: number; cantidad: number }; variacionPorcentual: number | null };
  serie: { fecha: string; total: number; cantidad: number }[];
}

interface ProductoRanking {
  productoId: string;
  nombre: string;
  unidadesVendidas: number;
  ingresos: number;
  margen: number;
  margenPorcentual: number | null;
}

interface EstadisticasProductos {
  masVendidos: ProductoRanking[];
  masRentables: ProductoRanking[];
  menosVendidos: ProductoRanking[];
}

interface EstadisticasGeneral {
  ingresos: number;
  numeroVentas: number;
  costoVentas: number;
  utilidadBruta: number;
  gastos: number;
  utilidadNeta: number;
  margenNetoPorcentual: number | null;
  comprasRecibidas: number;
  cuentasPorCobrar: number;
  cuentasPorPagar: number;
}

interface EstadisticasGastos {
  totalGastado: number;
  numeroGastos: number;
  porCategoria: { categoriaId: string; nombre: string; monto: number; cantidad: number; porcentajeDelTotal: number }[];
}

export default function EstadisticasPage() {
  const { esAdmin } = useSesion();
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [cargando, setCargando] = useState(true);

  const [ventas, setVentas] = useState<EstadisticasVentas | null>(null);
  const [productos, setProductos] = useState<EstadisticasProductos | null>(null);
  const [general, setGeneral] = useState<EstadisticasGeneral | null>(null);
  const [gastos, setGastos] = useState<EstadisticasGastos | null>(null);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);

    const peticiones: Promise<void>[] = [
      apiFetch(`/api/estadisticas/ventas?periodo=${periodo}`)
        .then((r) => r.json())
        .then((d) => { if (!cancelado) setVentas(d); }),
      apiFetch(`/api/estadisticas/productos?periodo=${periodo}`)
        .then((r) => r.json())
        .then((d) => { if (!cancelado) setProductos(d); }),
    ];

    // Los endpoints de "general" y "gastos" son solo-Administrador: ni
    // siquiera se piden si el rol en sesión es Vendedor (evita un 403 inútil).
    if (esAdmin) {
      peticiones.push(
        apiFetch(`/api/estadisticas/general?periodo=${periodo}`)
          .then((r) => r.json())
          .then((d) => { if (!cancelado) setGeneral(d); }),
        apiFetch(`/api/estadisticas/gastos?periodo=${periodo}`)
          .then((r) => r.json())
          .then((d) => { if (!cancelado) setGastos(d); })
      );
    }

    Promise.all(peticiones).finally(() => !cancelado && setCargando(false));
    return () => {
      cancelado = true;
    };
  }, [periodo, esAdmin]);

  return (
    <div>
      <PageHeader
        title="Estadísticas"
        description="Desempeño del negocio en el período seleccionado"
        actions={
          <SelectField
            label="Período"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value as Periodo)}
            className="w-44"
          >
            {PERIODOS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </SelectField>
        }
      />

      <div className="space-y-6">
        <Card>
          <CardHeader title="Ventas" description="Serie del período y comparación con el período anterior" />
          <CardBody>
            {cargando || !ventas ? (
              <Skeleton className="h-48" />
            ) : (
              <VentasChart datos={ventas} />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Productos" description="Ranking del período: más vendidos, más rentables y menos vendidos" />
          <CardBody className="space-y-6">
            {cargando || !productos ? (
              <Skeleton className="h-56" />
            ) : (
              <>
                <RankingTabla titulo="Más vendidos" filas={productos.masVendidos} metrica="unidades" />
                <RankingTabla titulo="Más rentables" filas={productos.masRentables} metrica="margen" />
                <RankingTabla titulo="Menos vendidos" filas={productos.menosVendidos} metrica="unidades" />
              </>
            )}
          </CardBody>
        </Card>

        {esAdmin && (
          <Card>
            <CardHeader title="General" description="Ingresos, costos y utilidad del negocio" />
            <CardBody>
              {cargando || !general ? (
                <Skeleton className="h-40" />
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  <StatTile label="Ingresos" value={formatoMoneda(general.ingresos)} icon={DollarSign} />
                  <StatTile label="Costo de ventas" value={formatoMoneda(general.costoVentas)} icon={Wallet} />
                  <StatTile label="Utilidad bruta" value={formatoMoneda(general.utilidadBruta)} icon={TrendingUp} />
                  <StatTile label="Gastos" value={formatoMoneda(general.gastos)} icon={Wallet} />
                  <StatTile
                    label="Utilidad neta"
                    value={formatoMoneda(general.utilidadNeta)}
                    icon={general.utilidadNeta >= 0 ? TrendingUp : TrendingDown}
                    alerta={general.utilidadNeta < 0}
                  />
                  <StatTile
                    label="Margen neto"
                    value={general.margenNetoPorcentual !== null ? `${general.margenNetoPorcentual}%` : "—"}
                    icon={Percent}
                  />
                  <StatTile label="Compras recibidas" value={formatoMoneda(general.comprasRecibidas)} icon={Truck} />
                  <StatTile label="Por cobrar (fiados)" value={formatoMoneda(general.cuentasPorCobrar)} icon={HandCoins} />
                  <StatTile label="Por pagar (proveedores)" value={formatoMoneda(general.cuentasPorPagar)} icon={Truck} />
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {esAdmin && (
          <Card>
            <CardHeader title="Gastos por categoría" />
            <CardBody>
              {cargando || !gastos ? (
                <Skeleton className="h-40" />
              ) : gastos.porCategoria.length === 0 ? (
                <EmptyState title="Sin gastos en este período" />
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-slate-500">
                    Total gastado: <span className="font-semibold tabular-nums text-slate-800">{formatoMoneda(gastos.totalGastado)}</span> en {gastos.numeroGastos} gasto(s)
                  </p>
                  {gastos.porCategoria.map((c) => (
                    <div key={c.categoriaId}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">{c.nombre}</span>
                        <span className="tabular-nums text-slate-500">
                          {formatoMoneda(c.monto)} · {c.porcentajeDelTotal}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-brand-500" style={{ width: `${c.porcentajeDelTotal}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}

function VentasChart({ datos }: { datos: EstadisticasVentas }) {
  const { serie, comparativa } = datos;
  const max = Math.max(1, ...serie.map((s) => s.total));
  const variacion = comparativa.variacionPorcentual;
  const IconoVariacion = variacion === null ? Minus : variacion >= 0 ? TrendingUp : TrendingDown;
  const colorVariacion = variacion === null ? "text-slate-400" : variacion >= 0 ? "text-success-600" : "text-danger-600";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">Total del período</p>
          <p className="font-display text-2xl font-bold tabular-nums text-slate-900">{formatoMoneda(datos.montoTotal)}</p>
          <p className="text-xs text-slate-400">
            {datos.totalVentas} venta(s) · ticket promedio {formatoMoneda(datos.ticketPromedio)}
          </p>
        </div>
        <div className={`flex items-center gap-1.5 text-sm font-medium ${colorVariacion}`}>
          <IconoVariacion className="h-4 w-4" aria-hidden />
          {variacion === null ? "Sin período anterior" : `${variacion > 0 ? "+" : ""}${variacion}% vs. período anterior`}
        </div>
      </div>

      {serie.length === 0 ? (
        <EmptyState title="Sin ventas en este período" />
      ) : (
        <>
          <div className="flex h-40 items-end gap-1.5 border-b border-slate-100">
            {serie.map((punto) => (
              <div key={punto.fecha} className="group relative flex-1">
                <div
                  className="mx-auto w-full rounded-t-md bg-brand-400 transition-colors group-hover:bg-brand-500"
                  style={{ height: `${Math.max(4, (punto.total / max) * 144)}px` }}
                  role="img"
                  aria-label={`${punto.fecha}: ${formatoMoneda(punto.total)}, ${punto.cantidad} venta(s)`}
                />
                <div className="pointer-events-none absolute -top-9 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white group-hover:block">
                  {formatoMoneda(punto.total)}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-1 flex gap-1.5 text-center text-[10px] text-slate-400">
            {serie.map((punto) => (
              <div key={punto.fecha} className="flex-1 truncate">
                {punto.fecha.slice(5)}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function RankingTabla({
  titulo,
  filas,
  metrica,
}: {
  titulo: string;
  filas: ProductoRanking[];
  metrica: "unidades" | "margen";
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-slate-700">{titulo}</h3>
      <TableShell>
        <Thead>
          <tr>
            <Th>Producto</Th>
            <Th>Unidades</Th>
            <Th>Ingresos</Th>
            <Th>Margen</Th>
          </tr>
        </Thead>
        <tbody>
          {filas.slice(0, 5).map((f) => (
            <Tr key={f.productoId}>
              <Td className="font-medium text-slate-900">{f.nombre}</Td>
              <Td className="tabular-nums">{f.unidadesVendidas}</Td>
              <Td className="tabular-nums">{formatoMoneda(f.ingresos)}</Td>
              <Td className="tabular-nums">
                {formatoMoneda(f.margen)}
                {f.margenPorcentual !== null && (
                  <Badge tono={f.margenPorcentual >= 0 ? "success" : "danger"}>{f.margenPorcentual}%</Badge>
                )}
              </Td>
            </Tr>
          ))}
          {filas.length === 0 && <EmptyRow colSpan={4}>Sin datos para este período.</EmptyRow>}
        </tbody>
      </TableShell>
    </div>
  );
}
