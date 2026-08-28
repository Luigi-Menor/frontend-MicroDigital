"use client";

import { useEffect, useMemo, useState, FormEvent } from "react";
import { Plus, Download, Boxes, AlertTriangle, Wallet } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatoMoneda, formatoFechaHora } from "@/lib/format";
import { useSesion } from "../SesionContext";
import {
  PageHeader,
  Button,
  TextField,
  SelectField,
  TextareaField,
  Card,
  CardHeader,
  CardBody,
  Badge,
  Alert,
  Modal,
  TableShell,
  Thead,
  Th,
  Tr,
  Td,
  EmptyRow,
  TableSkeleton,
  StatTile,
  EmptyState,
} from "@/app/components/ui";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type TipoMovimiento =
  | "ENTRADA"
  | "SALIDA"
  | "AJUSTE"
  | "MERMA"
  | "VENTA"
  | "ANULACION_VENTA"
  | "COMPRA"
  | "ANULACION_COMPRA";

interface Variante {
  id: string;
  nombre: string;
  stock: number;
  stockMinimo: number;
  activo: boolean;
}
interface Producto {
  id: string;
  nombre: string;
  tipo: "PRODUCTO" | "SERVICIO";
  stock: number;
  variantes: Variante[];
}
interface Movimiento {
  id: string;
  tipo: TipoMovimiento;
  cantidad: number;
  stockAnterior: number;
  stockResultante: number;
  motivo: string | null;
  referenciaTipo: string | null;
  createdAt: string;
  producto: { id: string; nombre: string };
  variante: { id: string; nombre: string } | null;
  usuario: { id: string; nombre: string } | null;
}
interface Alerta {
  productoId: string;
  varianteId: string | null;
  nombre: string;
  categoria: string | null;
  stock: number;
  stockMinimo: number;
  faltante: number;
}

const TONO_TIPO: Record<TipoMovimiento, "success" | "danger" | "warning" | "neutral"> = {
  ENTRADA: "success",
  COMPRA: "success",
  ANULACION_VENTA: "success",
  SALIDA: "danger",
  MERMA: "danger",
  VENTA: "danger",
  ANULACION_COMPRA: "danger",
  AJUSTE: "warning",
};

const ETIQUETA_TIPO: Record<TipoMovimiento, string> = {
  ENTRADA: "Entrada",
  SALIDA: "Salida",
  AJUSTE: "Ajuste",
  MERMA: "Merma",
  VENTA: "Venta",
  ANULACION_VENTA: "Anulación de venta",
  COMPRA: "Compra",
  ANULACION_COMPRA: "Anulación de compra",
};

const PERIODOS: { valor: string; etiqueta: string }[] = [
  { valor: "hoy", etiqueta: "Hoy" },
  { valor: "ayer", etiqueta: "Ayer" },
  { valor: "semana", etiqueta: "Esta semana" },
  { valor: "mes", etiqueta: "Este mes" },
  { valor: "anio", etiqueta: "Este año" },
  { valor: "todo", etiqueta: "Todo" },
];

export default function InventarioPage() {
  const { esAdmin } = useSesion();
  const [periodo, setPeriodo] = useState("mes");
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [cargandoMovimientos, setCargandoMovimientos] = useState(true);

  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [valorInventario, setValorInventario] = useState(0);
  const [cargandoAlertas, setCargandoAlertas] = useState(true);

  const [productos, setProductos] = useState<Producto[]>([]);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [modo, setModo] = useState<"movimiento" | "conteo">("movimiento");
  const [form, setForm] = useState({
    productoId: "",
    varianteId: "",
    tipo: "ENTRADA" as "ENTRADA" | "SALIDA" | "MERMA",
    cantidad: "",
    costoUnitario: "",
    stockFinal: "",
    motivo: "",
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cargarMovimientos(p: string, mounted: boolean = true) {
    if (!mounted) return;
    setCargandoMovimientos(true);
    const res = await apiFetch(`/api/inventario/movimientos?limite=100&periodo=${p}`);
    if (!mounted) return;
    const data = await res.json();
    if (!mounted) return;
    setMovimientos(data.movimientos ?? []);
    setCargandoMovimientos(false);
  }

  async function cargarAlertas(mounted: boolean = true) {
    if (!mounted) return;
    setCargandoAlertas(true);
    const res = await apiFetch("/api/inventario/alertas");
    if (!mounted) return;
    const data = await res.json();
    if (!mounted) return;
    setAlertas(data.alertas ?? []);
    setValorInventario(data.valorInventario ?? 0);
    setCargandoAlertas(false);
  }

  async function cargarProductos(mounted: boolean = true) {
    if (!mounted) return;
    const res = await apiFetch("/api/productos?limite=200&tipo=PRODUCTO");
    if (!mounted) return;
    const data = await res.json();
    if (!mounted) return;
    setProductos(data.productos ?? []);
  }

  useEffect(() => {
    let mounted = true;
    cargarMovimientos(periodo, mounted);
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo]);

  useEffect(() => {
    let mounted = true;
    cargarAlertas(mounted);
    cargarProductos(mounted);
    return () => {
      mounted = false;
    };
  }, []);

  const productoSeleccionado = useMemo(
    () => productos.find((p) => p.id === form.productoId) ?? null,
    [productos, form.productoId]
  );

  function abrirModal() {
    setForm({ productoId: "", varianteId: "", tipo: "ENTRADA", cantidad: "", costoUnitario: "", stockFinal: "", motivo: "" });
    setModo("movimiento");
    setError(null);
    setModalAbierto(true);
  }

  async function registrar(e: FormEvent) {
    e.preventDefault();
    if (!form.productoId) {
      setError("Selecciona un producto");
      return;
    }
    setError(null);
    setGuardando(true);

    const res = await apiFetch(modo === "movimiento" ? "/api/inventario/movimientos" : "/api/inventario/ajuste", {
      method: "POST",
      body: JSON.stringify(
        modo === "movimiento"
          ? {
              productoId: form.productoId,
              varianteId: form.varianteId || undefined,
              tipo: form.tipo,
              cantidad: Number(form.cantidad),
              costoUnitario: form.costoUnitario ? Number(form.costoUnitario) : undefined,
              motivo: form.motivo,
            }
          : {
              productoId: form.productoId,
              varianteId: form.varianteId || undefined,
              stockFinal: Number(form.stockFinal),
              motivo: form.motivo,
            }
      ),
    });
    const data = await res.json();
    setGuardando(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo registrar el movimiento");
      return;
    }
    setModalAbierto(false);
    cargarMovimientos(periodo);
    cargarAlertas();
    cargarProductos();
  }

  return (
    <div>
      <PageHeader
        title="Inventario"
        description="Kardex de movimientos y alertas de stock bajo"
        actions={
          esAdmin && (
            <Button variante="accent" onClick={abrirModal}>
              <Plus className="h-4 w-4" /> Registrar movimiento
            </Button>
          )
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatTile
          label="Productos en alerta"
          value={cargandoAlertas ? "…" : String(alertas.length)}
          icon={AlertTriangle}
          alerta={alertas.length > 0}
        />
        <StatTile label="Valor del inventario (a costo)" value={cargandoAlertas ? "…" : formatoMoneda(valorInventario)} icon={Wallet} />
        <StatTile label="Movimientos en el período" value={cargandoMovimientos ? "…" : String(movimientos.length)} icon={Boxes} />
      </div>

      <Card className="mb-6">
        <CardHeader title="Alertas de stock bajo" description="Productos y variantes en o por debajo de su mínimo" />
        <CardBody>
          {cargandoAlertas ? (
            <TableSkeleton columnas={4} filas={3} />
          ) : alertas.length === 0 ? (
            <EmptyState title="Todo el inventario está en orden" description="Ningún producto está por debajo de su stock mínimo." />
          ) : (
            <TableShell>
              <Thead>
                <tr>
                  <Th>Producto</Th>
                  <Th>Categoría</Th>
                  <Th>Stock</Th>
                  <Th>Faltante</Th>
                </tr>
              </Thead>
              <tbody>
                {alertas.map((a) => (
                  <Tr key={`${a.productoId}-${a.varianteId ?? "base"}`}>
                    <Td className="font-medium text-slate-900">{a.nombre}</Td>
                    <Td>{a.categoria ?? "—"}</Td>
                    <Td className="tabular-nums">
                      {a.stock} / mín. {a.stockMinimo}
                    </Td>
                    <Td>
                      <Badge tono="warning">Faltan {a.faltante}</Badge>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </CardBody>
      </Card>

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="w-48">
          <SelectField label="Período del kardex" value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
            {PERIODOS.map((p) => (
              <option key={p.valor} value={p.valor}>
                {p.etiqueta}
              </option>
            ))}
          </SelectField>
        </div>
        <a
          href={`${API_URL}/api/inventario/movimientos?formato=csv&periodo=${periodo}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button type="button" variante="secondary" tamano="sm">
            <Download className="h-4 w-4" /> Descargar CSV
          </Button>
        </a>
      </div>

      {cargandoMovimientos ? (
        <TableSkeleton columnas={6} />
      ) : (
        <TableShell>
          <Thead>
            <tr>
              <Th>Fecha</Th>
              <Th>Producto</Th>
              <Th>Tipo</Th>
              <Th>Cantidad</Th>
              <Th>Stock (antes → después)</Th>
              <Th>Motivo</Th>
            </tr>
          </Thead>
          <tbody>
            {movimientos.map((m) => (
              <Tr key={m.id}>
                <Td className="whitespace-nowrap">{formatoFechaHora(m.createdAt)}</Td>
                <Td>
                  {m.producto.nombre}
                  {m.variante ? ` - ${m.variante.nombre}` : ""}
                </Td>
                <Td>
                  <Badge tono={TONO_TIPO[m.tipo]}>{ETIQUETA_TIPO[m.tipo]}</Badge>
                </Td>
                <Td className="tabular-nums">{m.cantidad}</Td>
                <Td className="tabular-nums">
                  {m.stockAnterior} → {m.stockResultante}
                </Td>
                <Td className="text-slate-500">{m.motivo ?? "—"}</Td>
              </Tr>
            ))}
            {movimientos.length === 0 && <EmptyRow colSpan={6}>No hay movimientos registrados en este período.</EmptyRow>}
          </tbody>
        </TableShell>
      )}

      <Modal open={modalAbierto} onClose={() => setModalAbierto(false)} title="Registrar movimiento de inventario">
        <form onSubmit={registrar} className="space-y-4">
          <div className="flex gap-2 rounded-lg bg-slate-100 p-1 text-sm">
            <button
              type="button"
              onClick={() => setModo("movimiento")}
              className={`flex-1 rounded-md py-1.5 font-medium transition-colors ${modo === "movimiento" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"}`}
            >
              Entrada / salida / merma
            </button>
            <button
              type="button"
              onClick={() => setModo("conteo")}
              className={`flex-1 rounded-md py-1.5 font-medium transition-colors ${modo === "conteo" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"}`}
            >
              Conteo físico (fijar stock)
            </button>
          </div>
          <p className="text-xs text-slate-400">
            {modo === "movimiento"
              ? "Suma o resta una cantidad al stock actual (ideal para un ingreso o una salida puntual)."
              : "Fija el stock a un valor exacto, útil tras un conteo físico del inventario."}
          </p>

          <SelectField
            label="Producto"
            required
            value={form.productoId}
            onChange={(e) => setForm({ ...form, productoId: e.target.value, varianteId: "" })}
          >
            <option value="">Selecciona un producto</option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} (stock: {p.stock})
              </option>
            ))}
          </SelectField>

          {productoSeleccionado && productoSeleccionado.variantes.length > 0 && (
            <SelectField
              label="Variante (opcional)"
              value={form.varianteId}
              onChange={(e) => setForm({ ...form, varianteId: e.target.value })}
            >
              <option value="">Producto base (sin variante)</option>
              {productoSeleccionado.variantes.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nombre} (stock: {v.stock})
                </option>
              ))}
            </SelectField>
          )}

          {modo === "movimiento" ? (
            <div className="grid grid-cols-2 gap-3">
              <SelectField label="Tipo" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as "ENTRADA" | "SALIDA" | "MERMA" })}>
                <option value="ENTRADA">Entrada</option>
                <option value="SALIDA">Salida</option>
                <option value="MERMA">Merma</option>
              </SelectField>
              <TextField label="Cantidad" type="number" min={1} required value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} />
            </div>
          ) : (
            <TextField
              label="Stock final (conteo)"
              type="number"
              min={0}
              required
              value={form.stockFinal}
              onChange={(e) => setForm({ ...form, stockFinal: e.target.value })}
            />
          )}

          {modo === "movimiento" && (
            <TextField
              label="Costo unitario (opcional)"
              type="number"
              min={0}
              step="0.01"
              value={form.costoUnitario}
              onChange={(e) => setForm({ ...form, costoUnitario: e.target.value })}
            />
          )}

          <TextareaField
            label="Motivo"
            required
            hint="Obligatorio: queda registrado en el kardex."
            value={form.motivo}
            onChange={(e) => setForm({ ...form, motivo: e.target.value })}
          />

          {error && <Alert>{error}</Alert>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variante="secondary" onClick={() => setModalAbierto(false)}>
              Cancelar
            </Button>
            <Button type="submit" cargando={guardando}>
              Registrar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
