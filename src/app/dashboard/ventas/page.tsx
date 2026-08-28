"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Ban, ShoppingCart, Wallet, Landmark, HandCoins } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatoMoneda, formatoFechaHora } from "@/lib/format";
import { useSesion } from "../SesionContext";
import {
  PageHeader,
  Button,
  SelectField,
  TextField,
  Card,
  CardHeader,
  CardBody,
  Badge,
  Alert,
  TableShell,
  Thead,
  Th,
  Tr,
  Td,
  EmptyRow,
  TableSkeleton,
  StatTile,
} from "@/app/components/ui";

interface Producto {
  id: string;
  nombre: string;
  precio: string;
  stock: number;
  tipo: "PRODUCTO" | "SERVICIO";
}
interface Cliente {
  id: string;
  nombre: string;
}
interface VentaDetalle {
  id: string;
  cantidad: number;
  producto: { nombre: string };
}
interface Venta {
  id: string;
  total: string;
  formaPago: "EFECTIVO" | "TRANSFERENCIA" | "FIADO" | "TARJETA" | "OTRO";
  estado: "ACTIVA" | "ANULADA" | "EDITADA";
  createdAt: string;
  cliente: { nombre: string } | null;
  detalles: VentaDetalle[];
}
interface ResumenCaja {
  totalVentas: number;
  montoTotal: number;
  ventasAnuladas: number;
  porFormaPago: { formaPago: string; cantidad: number; monto: number }[];
}

const ETIQUETA_PAGO: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  FIADO: "Fiado",
  TARJETA: "Tarjeta",
  OTRO: "Otro",
};

export default function VentasPage() {
  const { esAdmin } = useSesion();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [resumen, setResumen] = useState<ResumenCaja | null>(null);
  const [cargando, setCargando] = useState(true);

  const [items, setItems] = useState<{ id: string; productoId: string; cantidad: number }[]>([]);
  const [nextItemId, setNextItemId] = useState(0);
  const [formaPago, setFormaPago] = useState<"EFECTIVO" | "TRANSFERENCIA" | "FIADO">("EFECTIVO");
  const [clienteId, setClienteId] = useState("");
  const [montoPagado, setMontoPagado] = useState("");
  const [registrando, setRegistrando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cargarTodo() {
    setCargando(true);
    const [rp, rc, rv, rr] = await Promise.all([
      apiFetch("/api/productos?limite=200"),
      apiFetch("/api/clientes?limite=200"),
      apiFetch("/api/ventas?limite=50"),
      apiFetch("/api/ventas/resumen-caja?periodo=hoy"),
    ]);
    setProductos((await rp.json()).productos ?? []);
    setClientes((await rc.json()).clientes ?? []);
    setVentas((await rv.json()).ventas ?? []);
    setResumen(rr.ok ? await rr.json() : null);
    setCargando(false);
  }

  useEffect(() => {
    cargarTodo();
  }, []);

  const total = useMemo(() => {
    return items.reduce((acc, item) => {
      const p = productos.find((prod) => prod.id === item.productoId);
      return acc + (p ? Number(p.precio) * item.cantidad : 0);
    }, 0);
  }, [items, productos]);

  const cambio = formaPago === "EFECTIVO" && montoPagado ? Math.max(0, Number(montoPagado) - total) : null;

  function agregarItem() {
    const primero = productos[0];
    if (!primero) return;
    setItems((it) => [...it, { id: String(nextItemId), productoId: primero.id, cantidad: 1 }]);
    setNextItemId((n) => n + 1);
  }

  function quitarItem(index: number) {
    setItems((it) => it.filter((_, i) => i !== index));
  }

  function actualizarItem(index: number, campo: "productoId" | "cantidad", valor: string) {
    setItems((it) =>
      it.map((item, i) => (i === index ? { ...item, [campo]: campo === "cantidad" ? Number(valor) : valor } : item))
    );
  }

  async function registrarVenta() {
    setError(null);
    if (items.length === 0) {
      setError("Agrega al menos un producto");
      return;
    }
    if (formaPago === "FIADO" && !clienteId) {
      setError("Selecciona un cliente para una venta fiada");
      return;
    }
    setRegistrando(true);
    const res = await apiFetch("/api/ventas", {
      method: "POST",
      body: JSON.stringify({
        items: items.map(({ id, ...item }) => item),
        formaPago,
        clienteId: formaPago === "FIADO" ? clienteId : undefined,
        montoPagado: formaPago === "EFECTIVO" && montoPagado ? Number(montoPagado) : undefined,
      }),
    });
    const data = await res.json();
    setRegistrando(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo registrar la venta");
      return;
    }
    setItems([]);
    setClienteId("");
    setMontoPagado("");
    cargarTodo();
  }

  async function anularVenta(id: string) {
    const motivo = window.prompt("Motivo de anulación (obligatorio):");
    if (!motivo) return; // RF-011: motivo obligatorio al anular
    const res = await apiFetch(`/api/ventas/${id}`, {
      method: "PUT",
      body: JSON.stringify({ accion: "ANULADA", motivo }),
    });
    if (res.ok) cargarTodo();
  }

  return (
    <div>
      <PageHeader title="Ventas" description="Registra ventas y consulta el historial del negocio" />

      {esAdmin && resumen && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatTile label="Ventas de hoy" value={String(resumen.totalVentas)} icon={ShoppingCart} />
          <StatTile label="Total del día" value={formatoMoneda(resumen.montoTotal)} icon={Wallet} />
          {resumen.porFormaPago.map((f) => (
            <StatTile
              key={f.formaPago}
              label={ETIQUETA_PAGO[f.formaPago] ?? f.formaPago}
              value={formatoMoneda(f.monto)}
              icon={f.formaPago === "FIADO" ? HandCoins : Landmark}
              hint={`${f.cantidad} venta(s)`}
            />
          ))}
        </div>
      )}

      <Card className="mb-8">
        <CardHeader title="Nueva venta" />
        <CardBody>
          {productos.length === 0 ? (
            <Alert tono="info">Registra al menos un producto en el catálogo antes de vender.</Alert>
          ) : (
            <>
              <div className="mb-3 space-y-2">
                {items.map((item, i) => {
                  const producto = productos.find((p) => p.id === item.productoId);
                  return (
                    <div key={item.id} className="flex gap-2">
                      <select
                        aria-label="Producto"
                        value={item.productoId}
                        onChange={(e) => actualizarItem(i, "productoId", e.target.value)}
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                      >
                        {productos.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre} {p.tipo === "PRODUCTO" ? `(stock: ${p.stock})` : "(servicio)"}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={1}
                        max={producto && producto.tipo === "PRODUCTO" ? producto.stock : undefined}
                        aria-label="Cantidad"
                        value={item.cantidad}
                        onChange={(e) => actualizarItem(i, "cantidad", e.target.value)}
                        className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                      />
                      <button
                        onClick={() => quitarItem(i)}
                        aria-label="Quitar producto"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-danger-50 hover:text-danger-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
              <Button type="button" variante="ghost" tamano="sm" onClick={agregarItem} className="mb-4">
                <Plus className="h-4 w-4" /> Agregar producto
              </Button>

              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <SelectField
                  label="Forma de pago"
                  value={formaPago}
                  onChange={(e) => setFormaPago(e.target.value as typeof formaPago)}
                >
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="FIADO">Fiado</option>
                </SelectField>

                {formaPago === "FIADO" && (
                  <SelectField label="Cliente" value={clienteId} onChange={(e) => setClienteId(e.target.value)} required>
                    <option value="">Selecciona un cliente</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </SelectField>
                )}

                {formaPago === "EFECTIVO" && (
                  <TextField
                    label="Efectivo recibido (opcional)"
                    type="number"
                    min={0}
                    value={montoPagado}
                    onChange={(e) => setMontoPagado(e.target.value)}
                  />
                )}
              </div>

              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-4 py-3">
                <span className="text-sm text-slate-500">Total a cobrar</span>
                <span className="font-display text-xl font-bold tabular-nums text-slate-900">{formatoMoneda(total)}</span>
              </div>
              {cambio !== null && (
                <p className="mb-4 text-sm text-slate-500">
                  Cambio a devolver: <span className="font-semibold tabular-nums text-slate-700">{formatoMoneda(cambio)}</span>
                </p>
              )}

              {error && <Alert>{error}</Alert>}

              <Button variante="accent" cargando={registrando} onClick={registrarVenta} className="mt-4">
                Registrar venta
              </Button>
            </>
          )}
        </CardBody>
      </Card>

      {cargando ? (
        <TableSkeleton columnas={6} />
      ) : (
        <TableShell>
          <Thead>
            <tr>
              <Th>Fecha</Th>
              <Th>Productos</Th>
              <Th>Forma de pago</Th>
              <Th>Total</Th>
              <Th>Estado</Th>
              <Th />
            </tr>
          </Thead>
          <tbody>
            {ventas.map((v) => (
              <Tr key={v.id}>
                <Td className="whitespace-nowrap">{formatoFechaHora(v.createdAt)}</Td>
                <Td>{v.detalles.map((d) => `${d.producto.nombre} x${d.cantidad}`).join(", ")}</Td>
                <Td>
                  {ETIQUETA_PAGO[v.formaPago] ?? v.formaPago}
                  {v.cliente ? ` (${v.cliente.nombre})` : ""}
                </Td>
                <Td className="tabular-nums font-medium">{formatoMoneda(v.total)}</Td>
                <Td>
                  <Badge tono={v.estado === "ACTIVA" ? "success" : v.estado === "ANULADA" ? "danger" : "warning"}>
                    {v.estado === "ACTIVA" ? "Activa" : v.estado === "ANULADA" ? "Anulada" : "Editada"}
                  </Badge>
                </Td>
                <Td>
                  {v.estado === "ACTIVA" && (
                    <button
                      onClick={() => anularVenta(v.id)}
                      className="flex items-center gap-1 text-xs font-medium text-danger-600 hover:underline"
                    >
                      <Ban className="h-3.5 w-3.5" /> Anular
                    </button>
                  )}
                </Td>
              </Tr>
            ))}
            {ventas.length === 0 && <EmptyRow colSpan={6}>Aún no hay ventas registradas.</EmptyRow>}
          </tbody>
        </TableShell>
      )}
    </div>
  );
}
