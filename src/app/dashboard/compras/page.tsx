"use client";

import { useEffect, useMemo, useState, useReducer, FormEvent } from "react";
import { Plus, Trash2, PackageCheck, Ban } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatoMoneda, formatoFecha } from "@/lib/format";
import { useSesion } from "../SesionContext";
import {
  PageHeader,
  Button,
  TextField,
  SelectField,
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
} from "@/app/components/ui";

interface Proveedor {
  id: string;
  nombre: string;
}
interface Producto {
  id: string;
  nombre: string;
  precioCosto: string | null;
}
interface CompraDetalle {
  id: string;
  cantidad: number;
  producto: { nombre: string };
}
interface Compra {
  id: string;
  numero: number;
  estado: "BORRADOR" | "RECIBIDA" | "ANULADA";
  formaPago: string;
  total: string;
  saldoPendiente: string;
  fecha: string;
  proveedor: { id: string; nombre: string };
  detalles: CompraDetalle[];
}

const ESTADO_TONO: Record<Compra["estado"], "neutral" | "success" | "danger"> = {
  BORRADOR: "neutral",
  RECIBIDA: "success",
  ANULADA: "danger",
};
const ESTADO_ETIQUETA: Record<Compra["estado"], string> = {
  BORRADOR: "Borrador",
  RECIBIDA: "Recibida",
  ANULADA: "Anulada",
};

interface CompraFormState {
  modalNuevo: boolean;
  proveedorId: string;
  items: { id: string; productoId: string; cantidad: number; costoUnitario: number }[];
  nextItemId: number;
  formaPago: "EFECTIVO" | "TRANSFERENCIA" | "FIADO" | "TARJETA" | "OTRO";
  numeroFactura: string;
  nota: string;
  guardando: boolean;
  error: string | null;
}

type CompraFormAction =
  | { type: "ABRIR_MODAL" }
  | { type: "CERRAR_MODAL" }
  | { type: "SET_PROVEEDOR"; proveedorId: string }
  | { type: "AGREGAR_ITEM"; productoId: string; costoUnitario: number }
  | { type: "QUITAR_ITEM"; index: number }
  | { type: "ACTUALIZAR_ITEM"; index: number; campo: string; valor: any }
  | { type: "SET_FORMA_PAGO"; formaPago: any }
  | { type: "SET_NUMERO_FACTURA"; numeroFactura: string }
  | { type: "SET_NOTA"; nota: string }
  | { type: "SET_GUARDANDO"; guardando: boolean }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "RESET_FORM" };

function compraFormReducer(state: CompraFormState, action: CompraFormAction): CompraFormState {
  switch (action.type) {
    case "ABRIR_MODAL":
      return { ...state, modalNuevo: true, proveedorId: "", items: [], formaPago: "EFECTIVO", numeroFactura: "", nota: "", error: null };
    case "CERRAR_MODAL":
      return { ...state, modalNuevo: false };
    case "SET_PROVEEDOR":
      return { ...state, proveedorId: action.proveedorId };
    case "AGREGAR_ITEM":
      return { ...state, items: [...state.items, { id: String(state.nextItemId), productoId: action.productoId, cantidad: 1, costoUnitario: action.costoUnitario }], nextItemId: state.nextItemId + 1 };
    case "QUITAR_ITEM":
      return { ...state, items: state.items.filter((_, i) => i !== action.index) };
    case "ACTUALIZAR_ITEM": {
      const i = action.index;
      const campo = action.campo;
      const valor = action.valor;
      return { ...state, items: state.items.map((item, idx) => idx === i ? { ...item, [campo]: campo === "cantidad" ? Number(valor) : campo === "costoUnitario" ? Number(valor) : valor } : item) };
    }
    case "SET_FORMA_PAGO":
      return { ...state, formaPago: action.formaPago };
    case "SET_NUMERO_FACTURA":
      return { ...state, numeroFactura: action.numeroFactura };
    case "SET_NOTA":
      return { ...state, nota: action.nota };
    case "SET_GUARDANDO":
      return { ...state, guardando: action.guardando };
    case "SET_ERROR":
      return { ...state, error: action.error };
    case "RESET_FORM":
      return { ...state, proveedorId: "", items: [], formaPago: "EFECTIVO", numeroFactura: "", nota: "", error: null, guardando: false };
  }
}

export default function ComprasPage() {
  const { esAdmin } = useSesion();
  const [compras, setCompras] = useState<Compra[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);

  const [form, dispatchForm] = useReducer(compraFormReducer, {
    modalNuevo: false,
    proveedorId: "",
    items: [],
    nextItemId: 0,
    formaPago: "EFECTIVO",
    numeroFactura: "",
    nota: "",
    guardando: false,
    error: null,
  });

  async function cargar() {
    setCargando(true);
    const [rc, rp, rprod] = await Promise.all([
      apiFetch("/api/compras?limite=100"),
      apiFetch("/api/proveedores?limite=200"),
      apiFetch("/api/productos?limite=200"),
    ]);
    setCompras((await rc.json()).compras ?? []);
    setProveedores((await rp.json()).proveedores ?? []);
    setProductos((await rprod.json()).productos ?? []);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  const total = useMemo(() => form.items.reduce((acc, it) => acc + it.cantidad * it.costoUnitario, 0), [form.items]);

  function abrirNueva() {
    dispatchForm({ type: "ABRIR_MODAL" });
  }

  function agregarItem() {
    const primero = productos[0];
    if (!primero) return;
    dispatchForm({ type: "AGREGAR_ITEM", productoId: primero.id, costoUnitario: Number(primero.precioCosto ?? 0) });
  }

  function actualizarItem(index: number, campo: "productoId" | "cantidad" | "costoUnitario", valor: string) {
    dispatchForm({ type: "ACTUALIZAR_ITEM", index, campo, valor });
  }

  function quitarItem(index: number) {
    dispatchForm({ type: "QUITAR_ITEM", index });
  }

  async function crearCompra() {
    dispatchForm({ type: "SET_ERROR", error: null });
    if (!form.proveedorId) {
      dispatchForm({ type: "SET_ERROR", error: "Selecciona un proveedor" });
      return;
    }
    if (form.items.length === 0) {
      dispatchForm({ type: "SET_ERROR", error: "Agrega al menos un producto" });
      return;
    }
    dispatchForm({ type: "SET_GUARDANDO", guardando: true });
    const res = await apiFetch("/api/compras", {
      method: "POST",
      body: JSON.stringify({
        proveedorId: form.proveedorId,
        items: form.items.map(({ id, ...item }) => item),
        formaPago: form.formaPago,
        numeroFactura: form.numeroFactura || undefined,
        nota: form.nota || undefined,
      }),
    });
    const data = await res.json();
    dispatchForm({ type: "SET_GUARDANDO", guardando: false });
    if (!res.ok) {
      dispatchForm({ type: "SET_ERROR", error: data.error ?? "No se pudo registrar la compra" });
      return;
    }
    dispatchForm({ type: "CERRAR_MODAL" });
    cargar();
  }

  async function recibirCompra(c: Compra) {
    if (!window.confirm(`Al recibir la compra #${c.numero} se incrementará el stock de sus productos. ¿Continuar?`)) return;
    const res = await apiFetch(`/api/compras/${c.id}/recibir`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      window.alert(data.error ?? "No se pudo recibir la compra");
      return;
    }
    cargar();
  }

  async function anularCompra(c: Compra) {
    const motivo = window.prompt("Motivo de anulación (obligatorio):");
    if (!motivo) return;
    const res = await apiFetch(`/api/compras/${c.id}`, {
      method: "PUT",
      body: JSON.stringify({ accion: "ANULAR", motivo }),
    });
    const data = await res.json();
    if (!res.ok) {
      window.alert(data.error ?? "No se pudo anular la compra");
      return;
    }
    cargar();
  }

  return (
    <div>
      <PageHeader
        title="Compras"
        description="Abastecimiento y órdenes de compra a proveedores"
        actions={
          esAdmin && (
            <Button variante="accent" onClick={abrirNueva}>
              <Plus className="h-4 w-4" /> Nueva compra
            </Button>
          )
        }
      />

      {cargando ? (
        <TableSkeleton columnas={7} />
      ) : (
        <TableShell>
          <Thead>
            <tr>
              <Th>N.º</Th>
              <Th>Proveedor</Th>
              <Th>Fecha</Th>
              <Th>Estado</Th>
              <Th>Total</Th>
              <Th>Saldo</Th>
              {esAdmin && <Th />}
            </tr>
          </Thead>
          <tbody>
            {compras.map((c) => (
              <Tr key={c.id}>
                <Td className="tabular-nums">#{c.numero}</Td>
                <Td>
                  <p className="font-medium text-slate-900">{c.proveedor.nombre}</p>
                  <p className="text-xs text-slate-400">{c.detalles.map((d) => `${d.producto.nombre} x${d.cantidad}`).join(", ")}</p>
                </Td>
                <Td>{formatoFecha(c.fecha)}</Td>
                <Td>
                  <Badge tono={ESTADO_TONO[c.estado]}>{ESTADO_ETIQUETA[c.estado]}</Badge>
                </Td>
                <Td className="tabular-nums font-medium">{formatoMoneda(c.total)}</Td>
                <Td className="tabular-nums">{Number(c.saldoPendiente) > 0 ? formatoMoneda(c.saldoPendiente) : "—"}</Td>
                {esAdmin && (
                  <Td>
                    <div className="flex justify-end gap-2">
                      {c.estado === "BORRADOR" && (
                        <>
                          <button
                            onClick={() => recibirCompra(c)}
                            className="flex items-center gap-1 text-xs font-medium text-success-700 hover:underline"
                          >
                            <PackageCheck className="h-3.5 w-3.5" /> Recibir
                          </button>
                          <button
                            onClick={() => anularCompra(c)}
                            className="flex items-center gap-1 text-xs font-medium text-danger-600 hover:underline"
                          >
                            <Ban className="h-3.5 w-3.5" /> Anular
                          </button>
                        </>
                      )}
                      {c.estado === "RECIBIDA" && (
                        <button
                          onClick={() => anularCompra(c)}
                          className="flex items-center gap-1 text-xs font-medium text-danger-600 hover:underline"
                        >
                          <Ban className="h-3.5 w-3.5" /> Anular
                        </button>
                      )}
                    </div>
                  </Td>
                )}
              </Tr>
            ))}
            {compras.length === 0 && <EmptyRow colSpan={esAdmin ? 7 : 6}>Aún no hay compras registradas.</EmptyRow>}
          </tbody>
        </TableShell>
      )}

      <Modal open={form.modalNuevo} onClose={() => dispatchForm({ type: "CERRAR_MODAL" })} title="Nueva compra">
        <div className="space-y-4">
          <SelectField label="Proveedor" required value={form.proveedorId} onChange={(e) => dispatchForm({ type: "SET_PROVEEDOR", proveedorId: e.target.value })}>
            <option value="">Selecciona un proveedor</option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </SelectField>

          <div className="space-y-2">
            {form.items.map((item, i) => (
              <div key={item.id} className="flex gap-2">
                <select
                  aria-label="Producto"
                  value={item.productoId}
                  onChange={(e) => actualizarItem(i, "productoId", e.target.value)}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                >
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  aria-label="Cantidad"
                  value={item.cantidad}
                  onChange={(e) => actualizarItem(i, "cantidad", e.target.value)}
                  placeholder="Cant."
                  className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                />
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  aria-label="Costo unitario"
                  value={item.costoUnitario}
                  onChange={(e) => actualizarItem(i, "costoUnitario", e.target.value)}
                  placeholder="Costo unit."
                  className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                />
                <button
                  onClick={() => quitarItem(i)}
                  aria-label="Quitar producto"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-danger-50 hover:text-danger-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <Button type="button" variante="ghost" tamano="sm" onClick={agregarItem}>
            <Plus className="h-4 w-4" /> Agregar producto
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <SelectField label="Forma de pago" value={form.formaPago} onChange={(e) => dispatchForm({ type: "SET_FORMA_PAGO", formaPago: e.target.value })}>
              <option value="EFECTIVO">Efectivo</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="FIADO">Crédito (fiado)</option>
              <option value="TARJETA">Tarjeta</option>
              <option value="OTRO">Otro</option>
            </SelectField>
            <TextField label="N.º factura (opcional)" value={form.numeroFactura} onChange={(e) => dispatchForm({ type: "SET_NUMERO_FACTURA", numeroFactura: e.target.value })} />
          </div>
          <TextField label="Nota (opcional)" value={form.nota} onChange={(e) => dispatchForm({ type: "SET_NOTA", nota: e.target.value })} />

          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
            <span className="text-sm text-slate-500">Total de la compra</span>
            <span className="font-display text-lg font-bold tabular-nums text-slate-900">{formatoMoneda(total)}</span>
          </div>
          <p className="text-xs text-slate-400">
            La compra se guarda como borrador: el inventario solo aumenta cuando la marques como &quot;Recibida&quot;.
          </p>

          {form.error && <Alert>{form.error}</Alert>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variante="secondary" onClick={() => dispatchForm({ type: "CERRAR_MODAL" })}>
              Cancelar
            </Button>
            <Button type="button" cargando={form.guardando} onClick={crearCompra}>
              Guardar compra
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
