"use client";

import { useEffect, useState, FormEvent } from "react";
import { Plus, Pencil, Trophy } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatoMoneda, formatoFecha } from "@/lib/format";
import { useSesion } from "../SesionContext";
import {
  PageHeader,
  Button,
  TextField,
  SelectField,
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
} from "@/app/components/ui";

interface Vendedor {
  id: string;
  nombre: string;
  email: string;
  rol: "SUPERADMIN" | "ADMINISTRADOR" | "VENDEDOR";
  activo: boolean;
  telefono: string | null;
  documento: string | null;
  cargo: string | null;
  fechaIngreso: string | null;
  salarioBase: string | null;
  metaVentasMensual: string | null;
}

interface Rendimiento {
  usuarioId: string;
  nombre: string;
  activo: boolean;
  numeroVentas: number;
  montoVendido: number;
  meta: number | null;
  cumplimiento: number | null;
}

const FORM_VACIO = {
  nombre: "",
  email: "",
  password: "",
  rol: "VENDEDOR" as "ADMINISTRADOR" | "VENDEDOR",
  telefono: "",
  documento: "",
  cargo: "",
  fechaIngreso: "",
  salarioBase: "",
  metaVentasMensual: "",
};

const PERIODOS: { valor: string; etiqueta: string }[] = [
  { valor: "hoy", etiqueta: "Hoy" },
  { valor: "ayer", etiqueta: "Ayer" },
  { valor: "semana", etiqueta: "Esta semana" },
  { valor: "mes", etiqueta: "Este mes" },
  { valor: "anio", etiqueta: "Este año" },
  { valor: "todo", etiqueta: "Todo" },
];

function badgeCumplimiento(r: Rendimiento) {
  if (r.meta === null) return <Badge tono="neutral">Sin meta</Badge>;
  const tono = (r.cumplimiento ?? 0) >= 100 ? "success" : "warning";
  return <Badge tono={tono}>{r.cumplimiento}%</Badge>;
}

export default function UsuariosPage() {
  const { sesion } = useSesion();
  const miId = sesion?.usuario.id;
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [modalNuevo, setModalNuevo] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [editando, setEditando] = useState<Vendedor | null>(null);

  const [periodo, setPeriodo] = useState("mes");
  const [rendimiento, setRendimiento] = useState<Rendimiento[]>([]);
  const [cargandoRendimiento, setCargandoRendimiento] = useState(true);

  async function cargarVendedores(mounted: boolean = true) {
    if (!mounted) return;
    setCargando(true);
    const res = await apiFetch("/api/usuarios");
    if (!mounted) return;
    const data = await res.json();
    if (!mounted) return;
    setVendedores(data.usuarios ?? []);
    setCargando(false);
  }

  async function cargarRendimiento(p: string, mounted: boolean = true) {
    if (!mounted) return;
    setCargandoRendimiento(true);
    const res = await apiFetch(`/api/usuarios/rendimiento?periodo=${p}`);
    if (!mounted) return;
    const data = await res.json();
    if (!mounted) return;
    setRendimiento(data.rendimiento ?? []);
    setCargandoRendimiento(false);
  }

  useEffect(() => {
    let mounted = true;
    cargarVendedores(mounted);
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    cargarRendimiento(periodo, mounted);
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo]);

  async function crearVendedor(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    const res = await apiFetch("/api/usuarios", {
      method: "POST",
      body: JSON.stringify({
        nombre: form.nombre,
        email: form.email,
        password: form.password,
        rol: form.rol,
        telefono: form.telefono || undefined,
        documento: form.documento || undefined,
        cargo: form.cargo || undefined,
        fechaIngreso: form.fechaIngreso || undefined,
        salarioBase: form.salarioBase ? Number(form.salarioBase) : undefined,
        metaVentasMensual: form.metaVentasMensual ? Number(form.metaVentasMensual) : undefined,
      }),
    });
    const data = await res.json();
    setGuardando(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo crear el usuario");
      return;
    }
    setForm(FORM_VACIO);
    setModalNuevo(false);
    cargarVendedores();
  }

  async function guardarEdicion(e: FormEvent) {
    e.preventDefault();
    if (!editando) return;
    setError(null);
    setGuardando(true);
    const res = await apiFetch(`/api/usuarios/${editando.id}`, {
      method: "PUT",
      body: JSON.stringify({
        nombre: editando.nombre,
        activo: editando.activo,
        rol: editando.rol === "SUPERADMIN" ? undefined : editando.rol,
        telefono: editando.telefono,
        documento: editando.documento,
        cargo: editando.cargo,
        fechaIngreso: editando.fechaIngreso,
        salarioBase: editando.salarioBase ? Number(editando.salarioBase) : null,
        metaVentasMensual: editando.metaVentasMensual ? Number(editando.metaVentasMensual) : null,
      }),
    });
    const data = await res.json();
    setGuardando(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo guardar el usuario");
      return;
    }
    setEditando(null);
    cargarVendedores();
    cargarRendimiento(periodo);
  }

  return (
    <div>
      <PageHeader
        title="Usuarios"
        description="Gestiona tu equipo y revisa su rendimiento de ventas"
        actions={
          <Button
            variante="accent"
            onClick={() => {
              setForm(FORM_VACIO);
              setError(null);
              setModalNuevo(true);
            }}
          >
            <Plus className="h-4 w-4" /> Nuevo usuario
          </Button>
        }
      />

      {cargando ? (
        <TableSkeleton columnas={5} />
      ) : (
        <TableShell>
          <Thead>
            <tr>
              <Th>Nombre</Th>
              <Th>Correo</Th>
              <Th>Rol</Th>
              <Th>Estado</Th>
              <Th />
            </tr>
          </Thead>
          <tbody>
            {vendedores.map((v) => (
              <Tr key={v.id}>
                <Td>
                  <p className="font-medium text-slate-900">{v.nombre}</p>
                  {v.telefono && <p className="text-xs text-slate-400">{v.telefono}</p>}
                </Td>
                <Td>{v.email}</Td>
                <Td>
                  <Badge tono={v.rol === "ADMINISTRADOR" ? "info" : "neutral"}>
                    {v.rol === "ADMINISTRADOR" ? "Administrador" : "Vendedor"}
                  </Badge>
                  {v.cargo && <p className="mt-0.5 text-xs text-slate-400">{v.cargo}</p>}
                </Td>
                <Td>
                  <Badge tono={v.activo ? "success" : "neutral"}>{v.activo ? "Activo" : "Inactivo"}</Badge>
                </Td>
                <Td>
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setError(null);
                        setEditando(v);
                      }}
                      aria-label={`Editar ${v.nombre}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                </Td>
              </Tr>
            ))}
            {vendedores.length === 0 && <EmptyRow colSpan={5}>Aún no has agregado usuarios.</EmptyRow>}
          </tbody>
        </TableShell>
      )}

      <Card className="mt-8">
        <CardHeader
          title="Rendimiento"
          description="Ventas registradas por cada vendedor en el período seleccionado"
          action={
            <div className="w-44">
              <SelectField label="Período" value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
                {PERIODOS.map((p) => (
                  <option key={p.valor} value={p.valor}>
                    {p.etiqueta}
                  </option>
                ))}
              </SelectField>
            </div>
          }
        />
        <CardBody>
          {cargandoRendimiento ? (
            <TableSkeleton columnas={4} filas={3} />
          ) : rendimiento.length === 0 ? (
            <p className="text-sm text-slate-400">Aún no hay vendedores registrados.</p>
          ) : (
            <TableShell>
              <Thead>
                <tr>
                  <Th>Vendedor</Th>
                  <Th>Ventas</Th>
                  <Th>Monto vendido</Th>
                  <Th>Meta mensual</Th>
                  <Th>Cumplimiento</Th>
                </tr>
              </Thead>
              <tbody>
                {rendimiento.map((r, i) => (
                  <Tr key={r.usuarioId}>
                    <Td>
                      <div className="flex items-center gap-2">
                        {i === 0 && r.montoVendido > 0 && <Trophy className="h-4 w-4 text-brand-500" aria-hidden />}
                        <span className="font-medium text-slate-900">{r.nombre}</span>
                        {!r.activo && <Badge tono="neutral">Inactivo</Badge>}
                      </div>
                    </Td>
                    <Td className="tabular-nums">{r.numeroVentas}</Td>
                    <Td className="tabular-nums font-medium">{formatoMoneda(r.montoVendido)}</Td>
                    <Td className="tabular-nums">{r.meta ? formatoMoneda(r.meta) : "—"}</Td>
                    <Td>{badgeCumplimiento(r)}</Td>
                  </Tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </CardBody>
      </Card>

      <Modal open={modalNuevo} onClose={() => setModalNuevo(false)} title="Nuevo usuario">
        <form onSubmit={crearVendedor} className="space-y-4">
          <TextField label="Nombre" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          <TextField label="Correo" type="email" autoComplete="off" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <TextField
            label="Contraseña"
            type="password"
            autoComplete="new-password"
            required
            hint="Mínimo 8 caracteres"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <SelectField
            label="Rol"
            value={form.rol}
            onChange={(e) => setForm({ ...form, rol: e.target.value as "ADMINISTRADOR" | "VENDEDOR" })}
          >
            <option value="VENDEDOR">Vendedor (registra ventas)</option>
            <option value="ADMINISTRADOR">Administrador (acceso total)</option>
          </SelectField>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Teléfono (opcional)" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
            <TextField label="Documento (opcional)" value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Cargo (opcional)" value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} />
            <TextField label="Fecha de ingreso (opcional)" type="date" value={form.fechaIngreso} onChange={(e) => setForm({ ...form, fechaIngreso: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Salario base (opcional)" type="number" min={0} value={form.salarioBase} onChange={(e) => setForm({ ...form, salarioBase: e.target.value })} />
            <TextField
              label="Meta de ventas mensual (opcional)"
              type="number"
              min={0}
              value={form.metaVentasMensual}
              onChange={(e) => setForm({ ...form, metaVentasMensual: e.target.value })}
            />
          </div>

          {error && <Alert>{error}</Alert>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variante="secondary" onClick={() => setModalNuevo(false)}>
              Cancelar
            </Button>
            <Button type="submit" cargando={guardando}>
              Guardar usuario
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editando} onClose={() => setEditando(null)} title="Editar usuario">
        {editando && (
          <form onSubmit={guardarEdicion} className="space-y-4">
            <TextField label="Nombre" required value={editando.nombre} onChange={(e) => setEditando({ ...editando, nombre: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Teléfono" value={editando.telefono ?? ""} onChange={(e) => setEditando({ ...editando, telefono: e.target.value })} />
              <TextField label="Documento" value={editando.documento ?? ""} onChange={(e) => setEditando({ ...editando, documento: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Cargo" value={editando.cargo ?? ""} onChange={(e) => setEditando({ ...editando, cargo: e.target.value })} />
              <TextField
                label="Fecha de ingreso"
                type="date"
                value={editando.fechaIngreso ? editando.fechaIngreso.slice(0, 10) : ""}
                onChange={(e) => setEditando({ ...editando, fechaIngreso: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Salario base" type="number" min={0} value={editando.salarioBase ?? ""} onChange={(e) => setEditando({ ...editando, salarioBase: e.target.value })} />
              <TextField
                label="Meta de ventas mensual"
                type="number"
                min={0}
                value={editando.metaVentasMensual ?? ""}
                onChange={(e) => setEditando({ ...editando, metaVentasMensual: e.target.value })}
              />
            </div>
            <SelectField
              label="Rol"
              value={editando.rol}
              disabled={editando.id === miId}
              hint={editando.id === miId ? "No puedes cambiar tu propio rol" : undefined}
              onChange={(e) => setEditando({ ...editando, rol: e.target.value as "ADMINISTRADOR" | "VENDEDOR" })}
            >
              <option value="VENDEDOR">Vendedor</option>
              <option value="ADMINISTRADOR">Administrador</option>
            </SelectField>
            <SelectField
              label="Estado"
              value={editando.activo ? "activo" : "inactivo"}
              disabled={editando.id === miId}
              hint={editando.id === miId ? "No puedes desactivar tu propia cuenta" : undefined}
              onChange={(e) => setEditando({ ...editando, activo: e.target.value === "activo" })}
            >
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </SelectField>
            {editando.fechaIngreso && (
              <p className="text-xs text-slate-400">Ingresó el {formatoFecha(editando.fechaIngreso)}</p>
            )}

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
