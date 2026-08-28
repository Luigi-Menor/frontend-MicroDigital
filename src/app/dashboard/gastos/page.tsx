"use client";

import { useEffect, useState, useReducer, FormEvent } from "react";
import { Plus, Pencil, Trash2, Download, Receipt } from "lucide-react";
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
  StatTile,
} from "@/app/components/ui";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type Periodo = "hoy" | "ayer" | "semana" | "mes" | "anio" | "todo";
type FormaPago = "EFECTIVO" | "TRANSFERENCIA" | "FIADO" | "TARJETA" | "OTRO";

const ETIQUETA_PERIODO: Record<Periodo, string> = {
  hoy: "Hoy",
  ayer: "Ayer",
  semana: "Esta semana",
  mes: "Este mes",
  anio: "Este año",
  todo: "Todo",
};

const ETIQUETA_PAGO: Record<FormaPago, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  FIADO: "Fiado",
  TARJETA: "Tarjeta",
  OTRO: "Otro",
};

interface CategoriaGasto {
  id: string;
  nombre: string;
}
interface Proveedor {
  id: string;
  nombre: string;
}
interface Gasto {
  id: string;
  descripcion: string;
  monto: string;
  formaPago: FormaPago;
  fecha: string;
  nota: string | null;
  categoriaGasto: CategoriaGasto | null;
  proveedor: Proveedor | null;
}

const FORM_VACIO = {
  categoriaGastoId: "",
  proveedorId: "",
  descripcion: "",
  monto: "",
  formaPago: "EFECTIVO" as FormaPago,
  fecha: "",
  nota: "",
};

type GastoFormState = {
  modalNuevo: boolean; form: typeof FORM_VACIO; error: string | null; guardando: boolean;
  nuevaCategoria: string; creandoCategoria: boolean;
};

type GastoFormAction =
  | { type: "ABRIR_MODAL" } | { type: "CERRAR_MODAL" } | { type: "SET_FORM"; form: typeof FORM_VACIO }
  | { type: "SET_ERROR"; error: string | null } | { type: "SET_GUARDANDO"; guardando: boolean }
  | { type: "SET_NUEVA_CATEGORIA"; nuevaCategoria: string } | { type: "SET_CREANDO_CATEGORIA"; creandoCategoria: boolean };

function gastoFormReducer(state: GastoFormState, action: GastoFormAction): GastoFormState {
  switch (action.type) {
    case "ABRIR_MODAL": return { ...state, modalNuevo: true, form: FORM_VACIO, error: null };
    case "CERRAR_MODAL": return { ...state, modalNuevo: false };
    case "SET_FORM": return { ...state, form: action.form };
    case "SET_ERROR": return { ...state, error: action.error };
    case "SET_GUARDANDO": return { ...state, guardando: action.guardando };
    case "SET_NUEVA_CATEGORIA": return { ...state, nuevaCategoria: action.nuevaCategoria };
    case "SET_CREANDO_CATEGORIA": return { ...state, creandoCategoria: action.creandoCategoria };
  }
}

export default function GastosPage() {
  const { esAdmin } = useSesion();
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [categorias, setCategorias] = useState<CategoriaGasto[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [totalPeriodo, setTotalPeriodo] = useState(0);
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [cargando, setCargando] = useState(true);

  const [formState, dispatchForm] = useReducer(gastoFormReducer, {
    modalNuevo: false, form: FORM_VACIO, error: null, guardando: false,
    nuevaCategoria: "", creandoCategoria: false,
  });

  const [editando, setEditando] = useState<Gasto | null>(null);

  async function cargar(p: Periodo, mounted: boolean = true) {
    if (!mounted) return;
    setCargando(true);
    const [rg, rc, rp] = await Promise.all([
      apiFetch(`/api/gastos?limite=200&periodo=${p}`),
      apiFetch("/api/categorias-gasto"),
      apiFetch("/api/proveedores?limite=200"),
    ]);
    if (!mounted) return;
    const [dg, dc, dp] = await Promise.all([
      rg.json(),
      rc.json(),
      rp.ok ? rp.json() : Promise.resolve({ proveedores: [] }),
    ]);
    if (!mounted) return;
    setGastos(dg.gastos ?? []);
    setTotalPeriodo(dg.totalPeriodo ?? 0);
    setCategorias(dc.categorias ?? []);
    setProveedores(dp.proveedores ?? []);
    setCargando(false);
  }

  useEffect(() => {
    let mounted = true;
    cargar(periodo, mounted);
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo]);

  async function crearCategoriaRapida() {
    if (!formState.nuevaCategoria.trim()) return;
    dispatchForm({ type: "SET_CREANDO_CATEGORIA", creandoCategoria: true });
    const res = await apiFetch("/api/categorias-gasto", { method: "POST", body: JSON.stringify({ nombre: formState.nuevaCategoria }) });
    const data = await res.json();
    dispatchForm({ type: "SET_CREANDO_CATEGORIA", creandoCategoria: false });
    if (!res.ok) {
      dispatchForm({ type: "SET_ERROR", error: data.error ?? "No se pudo crear la categoría" });
      return;
    }
    setCategorias((c) => [...c, data.categoria].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    dispatchForm({ type: "SET_FORM", form: { ...formState.form, categoriaGastoId: data.categoria.id } });
    dispatchForm({ type: "SET_NUEVA_CATEGORIA", nuevaCategoria: "" });
  }

  async function crearGasto(e: FormEvent) {
    e.preventDefault();
    dispatchForm({ type: "SET_ERROR", error: null });
    dispatchForm({ type: "SET_GUARDANDO", guardando: true });
    const res = await apiFetch("/api/gastos", {
      method: "POST",
      body: JSON.stringify({
        categoriaGastoId: formState.form.categoriaGastoId || undefined,
        proveedorId: formState.form.proveedorId || undefined,
        descripcion: formState.form.descripcion,
        monto: Number(formState.form.monto),
        formaPago: formState.form.formaPago,
        fecha: formState.form.fecha || undefined,
        nota: formState.form.nota || undefined,
      }),
    });
    const data = await res.json();
    dispatchForm({ type: "SET_GUARDANDO", guardando: false });
    if (!res.ok) {
      dispatchForm({ type: "SET_ERROR", error: data.error ?? "No se pudo registrar el gasto" });
      return;
    }
    dispatchForm({ type: "SET_FORM", form: FORM_VACIO });
    dispatchForm({ type: "CERRAR_MODAL" });
    cargar(periodo);
  }

  async function guardarEdicion(e: FormEvent) {
    e.preventDefault();
    if (!editando) return;
    dispatchForm({ type: "SET_ERROR", error: null });
    dispatchForm({ type: "SET_GUARDANDO", guardando: true });
    const res = await apiFetch(`/api/gastos/${editando.id}`, {
      method: "PUT",
      body: JSON.stringify({
        categoriaGastoId: editando.categoriaGasto?.id ?? null,
        proveedorId: editando.proveedor?.id ?? null,
        descripcion: editando.descripcion,
        monto: Number(editando.monto),
        formaPago: editando.formaPago,
        nota: editando.nota,
      }),
    });
    const data = await res.json();
    dispatchForm({ type: "SET_GUARDANDO", guardando: false });
    if (!res.ok) {
      dispatchForm({ type: "SET_ERROR", error: data.error ?? "No se pudo guardar el gasto" });
      return;
    }
    setEditando(null);
    cargar(periodo);
  }

  async function eliminarGasto(g: Gasto) {
    if (!window.confirm(`¿Eliminar el gasto "${g.descripcion}"?`)) return;
    const res = await apiFetch(`/api/gastos/${g.id}`, { method: "DELETE" });
    if (res.ok) cargar(periodo);
  }

  return (
    <div>
      <PageHeader
        title="Gastos"
        description="Registro y control de egresos del negocio"
        actions={
          <Button
            variante="accent"
            onClick={() => {
              dispatchForm({ type: "ABRIR_MODAL" });
            }}
          >
            <Plus className="h-4 w-4" /> Nuevo gasto
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-48">
          <SelectField label="Período" value={periodo} onChange={(e) => setPeriodo(e.target.value as Periodo)}>
            {Object.entries(ETIQUETA_PERIODO).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>
                {etiqueta}
              </option>
            ))}
          </SelectField>
        </div>
        <a
          href={`${API_URL}/api/gastos?formato=csv&periodo=${periodo}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button type="button" variante="secondary">
            <Download className="h-4 w-4" /> Descargar CSV
          </Button>
        </a>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label={`Gastado — ${ETIQUETA_PERIODO[periodo]}`} value={formatoMoneda(totalPeriodo)} icon={Receipt} alerta={totalPeriodo > 0} />
      </div>

      {cargando ? (
        <TableSkeleton columnas={6} />
      ) : (
        <TableShell>
          <Thead>
            <tr>
              <Th>Fecha</Th>
              <Th>Descripción</Th>
              <Th>Categoría</Th>
              <Th>Proveedor</Th>
              <Th>Monto</Th>
              <Th>Forma de pago</Th>
              {esAdmin && <Th />}
            </tr>
          </Thead>
          <tbody>
            {gastos.map((g) => (
              <Tr key={g.id}>
                <Td className="whitespace-nowrap">{formatoFecha(g.fecha)}</Td>
                <Td>
                  <p className="font-medium text-slate-900">{g.descripcion}</p>
                  {g.nota && <p className="text-xs text-slate-400">{g.nota}</p>}
                </Td>
                <Td>{g.categoriaGasto ? <Badge tono="brand">{g.categoriaGasto.nombre}</Badge> : "—"}</Td>
                <Td>{g.proveedor?.nombre ?? "—"}</Td>
                <Td className="tabular-nums font-medium">{formatoMoneda(g.monto)}</Td>
                <Td>{ETIQUETA_PAGO[g.formaPago]}</Td>
                {esAdmin && (
                  <Td>
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => {
                          dispatchForm({ type: "SET_ERROR", error: null });
                          setEditando(g);
                        }}
                        aria-label={`Editar ${g.descripcion}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => eliminarGasto(g)}
                        aria-label={`Eliminar ${g.descripcion}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-danger-50 hover:text-danger-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </Td>
                )}
              </Tr>
            ))}
            {gastos.length === 0 && (
              <EmptyRow colSpan={esAdmin ? 7 : 6}>No hay gastos registrados en este período.</EmptyRow>
            )}
          </tbody>
        </TableShell>
      )}

      <Modal open={formState.modalNuevo} onClose={() => dispatchForm({ type: "CERRAR_MODAL" })} title="Nuevo gasto">
        <form onSubmit={crearGasto} className="space-y-4">
          <TextField label="Descripción" required value={formState.form.descripcion} onChange={(e) => dispatchForm({ type: "SET_FORM", form: { ...formState.form, descripcion: e.target.value } })} />

          <div>
            <SelectField
              label="Categoría (opcional)"
              value={formState.form.categoriaGastoId}
              onChange={(e) => dispatchForm({ type: "SET_FORM", form: { ...formState.form, categoriaGastoId: e.target.value } })}
            >
              <option value="">Sin categoría</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </SelectField>
            {esAdmin && (
              <div className="mt-2 flex gap-2">
                <input
                  aria-label="Nombre de la categoría nueva"
                  placeholder="Crear categoría nueva..."
                  value={formState.nuevaCategoria}
                  onChange={(e) => dispatchForm({ type: "SET_NUEVA_CATEGORIA", nuevaCategoria: e.target.value })}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                />
                <Button type="button" variante="secondary" tamano="sm" cargando={formState.creandoCategoria} onClick={crearCategoriaRapida}>
                  Crear
                </Button>
              </div>
            )}
          </div>

          {proveedores.length > 0 && (
            <SelectField
              label="Proveedor (opcional)"
              value={formState.form.proveedorId}
              onChange={(e) => dispatchForm({ type: "SET_FORM", form: { ...formState.form, proveedorId: e.target.value } })}
            >
              <option value="">Sin proveedor</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </SelectField>
          )}

          <div className="grid grid-cols-2 gap-3">
            <TextField label="Monto" type="number" min={0.01} step="0.01" required value={formState.form.monto} onChange={(e) => dispatchForm({ type: "SET_FORM", form: { ...formState.form, monto: e.target.value } })} />
            <SelectField label="Forma de pago" value={formState.form.formaPago} onChange={(e) => dispatchForm({ type: "SET_FORM", form: { ...formState.form, formaPago: e.target.value as FormaPago } })}>
              {Object.entries(ETIQUETA_PAGO).map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </SelectField>
          </div>
          <TextField
            label="Fecha (opcional)"
            type="date"
            hint="Déjalo vacío para usar la fecha de hoy."
            value={formState.form.fecha}
            onChange={(e) => dispatchForm({ type: "SET_FORM", form: { ...formState.form, fecha: e.target.value } })}
          />
          <TextField label="Nota (opcional)" value={formState.form.nota} onChange={(e) => dispatchForm({ type: "SET_FORM", form: { ...formState.form, nota: e.target.value } })} />

          {formState.error && <Alert>{formState.error}</Alert>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variante="secondary" onClick={() => dispatchForm({ type: "CERRAR_MODAL" })}>
              Cancelar
            </Button>
            <Button type="submit" cargando={formState.guardando}>
              Guardar gasto
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editando} onClose={() => setEditando(null)} title="Editar gasto">
        {editando && (
          <form onSubmit={guardarEdicion} className="space-y-4">
            <TextField label="Descripción" required value={editando.descripcion} onChange={(e) => setEditando({ ...editando, descripcion: e.target.value })} />
            <SelectField
              label="Categoría"
              value={editando.categoriaGasto?.id ?? ""}
              onChange={(e) => {
                const cat = categorias.find((c) => c.id === e.target.value) ?? null;
                setEditando({ ...editando, categoriaGasto: cat });
              }}
            >
              <option value="">Sin categoría</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </SelectField>
            {proveedores.length > 0 && (
              <SelectField
                label="Proveedor"
                value={editando.proveedor?.id ?? ""}
                onChange={(e) => {
                  const prov = proveedores.find((p) => p.id === e.target.value) ?? null;
                  setEditando({ ...editando, proveedor: prov });
                }}
              >
                <option value="">Sin proveedor</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </SelectField>
            )}
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Monto" type="number" min={0.01} step="0.01" required value={editando.monto} onChange={(e) => setEditando({ ...editando, monto: e.target.value })} />
              <SelectField label="Forma de pago" value={editando.formaPago} onChange={(e) => setEditando({ ...editando, formaPago: e.target.value as FormaPago })}>
                {Object.entries(ETIQUETA_PAGO).map(([valor, etiqueta]) => (
                  <option key={valor} value={valor}>
                    {etiqueta}
                  </option>
                ))}
              </SelectField>
            </div>
            <TextField label="Nota" value={editando.nota ?? ""} onChange={(e) => setEditando({ ...editando, nota: e.target.value })} />

            {formState.error && <Alert>{formState.error}</Alert>}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variante="secondary" onClick={() => setEditando(null)}>
                Cancelar
              </Button>
              <Button type="submit" cargando={formState.guardando}>
                Guardar cambios
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
