"use client";

import { useEffect, useMemo, useState, FormEvent } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatoMoneda } from "@/lib/format";
import { useSesion } from "../SesionContext";
import {
  PageHeader,
  Button,
  TextField,
  SelectField,
  Card,
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
} from "@/app/components/ui";

interface Categoria {
  id: string;
  nombre: string;
}
interface Producto {
  id: string;
  tipo: "PRODUCTO" | "SERVICIO";
  nombre: string;
  descripcion: string | null;
  sku: string | null;
  unidad: string | null;
  precio: string;
  precioCosto: string | null;
  stock: number;
  stockMinimo: number;
  stockBajo: boolean;
  activo: boolean;
  categoria: Categoria | null;
}

const FORM_VACIO = {
  tipo: "PRODUCTO" as "PRODUCTO" | "SERVICIO",
  nombre: "",
  categoriaId: "",
  sku: "",
  unidad: "",
  precio: "",
  precioCosto: "",
  stock: "0",
  stockMinimo: "",
};

export default function ProductosPage() {
  const { esAdmin } = useSesion();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  const [modalNuevo, setModalNuevo] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [creandoCategoria, setCreandoCategoria] = useState(false);

  const [editando, setEditando] = useState<Producto | null>(null);

  async function cargar() {
    setCargando(true);
    const [rp, rc] = await Promise.all([apiFetch("/api/productos?limite=200"), apiFetch("/api/categorias")]);
    const [dp, dc] = await Promise.all([rp.json(), rc.json()]);
    setProductos(dp.productos ?? []);
    setCategorias(dc.categorias ?? []);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return productos;
    return productos.filter((p) => p.nombre.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q));
  }, [productos, busqueda]);

  async function crearCategoriaRapida() {
    if (!nuevaCategoria.trim()) return;
    setCreandoCategoria(true);
    const res = await apiFetch("/api/categorias", { method: "POST", body: JSON.stringify({ nombre: nuevaCategoria }) });
    const data = await res.json();
    setCreandoCategoria(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo crear la categoría");
      return;
    }
    setCategorias((c) => [...c, data.categoria].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    setForm((f) => ({ ...f, categoriaId: data.categoria.id }));
    setNuevaCategoria("");
  }

  async function crearProducto(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.tipo === "PRODUCTO" && form.stockMinimo === "") {
      setError("El stock mínimo es obligatorio para productos");
      return;
    }
    setGuardando(true);
    const res = await apiFetch("/api/productos", {
      method: "POST",
      body: JSON.stringify({
        tipo: form.tipo,
        nombre: form.nombre,
        categoriaId: form.categoriaId || undefined,
        sku: form.sku || undefined,
        unidad: form.unidad || undefined,
        precio: Number(form.precio),
        precioCosto: form.precioCosto ? Number(form.precioCosto) : undefined,
        stock: form.tipo === "PRODUCTO" ? Number(form.stock) : undefined,
        stockMinimo: form.tipo === "PRODUCTO" ? Number(form.stockMinimo) : undefined,
      }),
    });
    const data = await res.json();
    setGuardando(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo crear el producto");
      return;
    }
    setForm(FORM_VACIO);
    setModalNuevo(false);
    cargar();
  }

  async function guardarEdicion(e: FormEvent) {
    e.preventDefault();
    if (!editando) return;
    setError(null);
    setGuardando(true);
    const res = await apiFetch(`/api/productos/${editando.id}`, {
      method: "PUT",
      body: JSON.stringify({
        nombre: editando.nombre,
        categoriaId: editando.categoria?.id ?? null,
        sku: editando.sku,
        unidad: editando.unidad,
        precio: Number(editando.precio),
        precioCosto: editando.precioCosto ? Number(editando.precioCosto) : null,
        stockMinimo: editando.stockMinimo,
        activo: editando.activo,
      }),
    });
    const data = await res.json();
    setGuardando(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo guardar el producto");
      return;
    }
    setEditando(null);
    cargar();
  }

  async function eliminarProducto(p: Producto) {
    if (!window.confirm(`¿Eliminar o desactivar "${p.nombre}"?`)) return;
    const res = await apiFetch(`/api/productos/${p.id}`, { method: "DELETE" });
    if (res.ok) cargar();
  }

  return (
    <div>
      <PageHeader
        title="Productos"
        description="Catálogo de productos y servicios del negocio"
        actions={
          esAdmin && (
            <Button
              variante="accent"
              onClick={() => {
                setForm(FORM_VACIO);
                setError(null);
                setModalNuevo(true);
              }}
            >
              <Plus className="h-4 w-4" /> Nuevo producto
            </Button>
          )
        }
      />

      <div className="mb-4 max-w-xs">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            aria-label="Buscar productos por nombre o SKU"
            placeholder="Buscar por nombre o SKU..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>
      </div>

      {cargando ? (
        <TableSkeleton columnas={6} />
      ) : (
        <TableShell>
          <Thead>
            <tr>
              <Th>Nombre</Th>
              <Th>Categoría</Th>
              <Th>Precio</Th>
              <Th>Stock</Th>
              <Th>Estado</Th>
              {esAdmin && <Th />}
            </tr>
          </Thead>
          <tbody>
            {productosFiltrados.map((p) => (
              <Tr key={p.id}>
                <Td>
                  <p className="font-medium text-slate-900">{p.nombre}</p>
                  {p.sku && <p className="text-xs text-slate-400">SKU: {p.sku}</p>}
                </Td>
                <Td>{p.categoria?.nombre ?? "—"}</Td>
                <Td className="tabular-nums">{formatoMoneda(p.precio)}</Td>
                <Td className="tabular-nums">{p.tipo === "SERVICIO" ? "—" : `${p.stock} / mín. ${p.stockMinimo}`}</Td>
                <Td>
                  <div className="flex flex-wrap gap-1.5">
                    {!p.activo && <Badge tono="neutral">Inactivo</Badge>}
                    {p.tipo === "SERVICIO" ? (
                      <Badge tono="info">Servicio</Badge>
                    ) : p.stockBajo ? (
                      <Badge tono="warning">Stock bajo</Badge>
                    ) : (
                      <Badge tono="success">OK</Badge>
                    )}
                  </div>
                </Td>
                {esAdmin && (
                  <Td>
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => {
                          setError(null);
                          setEditando(p);
                        }}
                        aria-label={`Editar ${p.nombre}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => eliminarProducto(p)}
                        aria-label={`Eliminar ${p.nombre}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-danger-50 hover:text-danger-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </Td>
                )}
              </Tr>
            ))}
            {productosFiltrados.length === 0 && (
              <EmptyRow colSpan={esAdmin ? 6 : 5}>Aún no hay productos registrados.</EmptyRow>
            )}
          </tbody>
        </TableShell>
      )}

      <Modal open={modalNuevo} onClose={() => setModalNuevo(false)} title="Nuevo producto">
        <form onSubmit={crearProducto} className="space-y-4">
          <SelectField label="Tipo" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as "PRODUCTO" | "SERVICIO" })}>
            <option value="PRODUCTO">Producto (con inventario)</option>
            <option value="SERVICIO">Servicio (sin inventario)</option>
          </SelectField>
          <TextField label="Nombre" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />

          <div>
            <SelectField
              label="Categoría"
              value={form.categoriaId}
              onChange={(e) => setForm({ ...form, categoriaId: e.target.value })}
            >
              <option value="">Sin categoría</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </SelectField>
            <div className="mt-2 flex gap-2">
              <input
                aria-label="Nombre de la categoría nueva"
                placeholder="Crear categoría nueva..."
                value={nuevaCategoria}
                onChange={(e) => setNuevaCategoria(e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
              <Button type="button" variante="secondary" tamano="sm" cargando={creandoCategoria} onClick={crearCategoriaRapida}>
                Crear
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <TextField label="SKU (opcional)" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            <TextField label="Unidad (opcional)" placeholder="unidad, kg, hora..." value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Precio de venta" type="number" step="0.01" min={0} required value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} />
            <TextField label="Costo (opcional)" type="number" step="0.01" min={0} value={form.precioCosto} onChange={(e) => setForm({ ...form, precioCosto: e.target.value })} />
          </div>
          {form.tipo === "PRODUCTO" && (
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Stock inicial" type="number" min={0} value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
              <TextField label="Stock mínimo" type="number" min={0} required value={form.stockMinimo} onChange={(e) => setForm({ ...form, stockMinimo: e.target.value })} />
            </div>
          )}

          {error && <Alert>{error}</Alert>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variante="secondary" onClick={() => setModalNuevo(false)}>
              Cancelar
            </Button>
            <Button type="submit" cargando={guardando}>
              Guardar producto
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editando} onClose={() => setEditando(null)} title="Editar producto">
        {editando && (
          <form onSubmit={guardarEdicion} className="space-y-4">
            <TextField label="Nombre" required value={editando.nombre} onChange={(e) => setEditando({ ...editando, nombre: e.target.value })} />
            <SelectField
              label="Categoría"
              value={editando.categoria?.id ?? ""}
              onChange={(e) => {
                const cat = categorias.find((c) => c.id === e.target.value) ?? null;
                setEditando({ ...editando, categoria: cat });
              }}
            >
              <option value="">Sin categoría</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </SelectField>
            <div className="grid grid-cols-2 gap-3">
              <TextField label="SKU" value={editando.sku ?? ""} onChange={(e) => setEditando({ ...editando, sku: e.target.value })} />
              <TextField label="Unidad" value={editando.unidad ?? ""} onChange={(e) => setEditando({ ...editando, unidad: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Precio de venta" type="number" step="0.01" min={0} required value={editando.precio} onChange={(e) => setEditando({ ...editando, precio: e.target.value })} />
              <TextField label="Costo" type="number" step="0.01" min={0} value={editando.precioCosto ?? ""} onChange={(e) => setEditando({ ...editando, precioCosto: e.target.value })} />
            </div>
            {editando.tipo === "PRODUCTO" && (
              <TextField
                label="Stock mínimo"
                type="number"
                min={0}
                required
                value={editando.stockMinimo}
                onChange={(e) => setEditando({ ...editando, stockMinimo: Number(e.target.value) })}
              />
            )}
            <p className="text-xs text-slate-400">
              El stock actual no se edita aquí: usa Inventario → Ajuste para que quede el rastro del movimiento.
            </p>
            <SelectField
              label="Estado"
              value={editando.activo ? "activo" : "inactivo"}
              onChange={(e) => setEditando({ ...editando, activo: e.target.value === "activo" })}
            >
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </SelectField>

            {error && <Alert>{error}</Alert>}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variante="secondary" onClick={() => setEditando(null)}>
                Cancelar
              </Button>
              <Button type="submit" cargando={guardando}>
                Guardar cambios
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
