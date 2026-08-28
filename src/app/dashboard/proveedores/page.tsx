"use client";

import { useEffect, useState, FormEvent } from "react";
import { Plus, Pencil, Wallet, Search } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatoMoneda } from "@/lib/format";
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
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  nit: string | null;
  direccion: string | null;
  notas: string | null;
  saldoDeuda: string;
  activo: boolean;
}

const FORM_VACIO = { nombre: "", contacto: "", telefono: "", email: "", nit: "", direccion: "", notas: "" };

export default function ProveedoresPage() {
  const { esAdmin } = useSesion();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [modalNuevo, setModalNuevo] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [editando, setEditando] = useState<Proveedor | null>(null);
  const [pagoDe, setPagoDe] = useState<Proveedor | null>(null);
  const [monto, setMonto] = useState("");
  const [formaPago, setFormaPago] = useState<"EFECTIVO" | "TRANSFERENCIA" | "TARJETA" | "OTRO">("EFECTIVO");
  const [nota, setNota] = useState("");

  async function cargar() {
    setCargando(true);
    const res = await apiFetch(`/api/proveedores?limite=200${busqueda ? `&q=${encodeURIComponent(busqueda)}` : ""}`);
    const data = await res.json();
    setProveedores(data.proveedores ?? []);
    setCargando(false);
  }

  useEffect(() => {
    const t = setTimeout(cargar, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda]);

  async function crearProveedor(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    const res = await apiFetch("/api/proveedores", { method: "POST", body: JSON.stringify(form) });
    const data = await res.json();
    setGuardando(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo crear el proveedor");
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
    const res = await apiFetch(`/api/proveedores/${editando.id}`, {
      method: "PUT",
      body: JSON.stringify({
        nombre: editando.nombre,
        contacto: editando.contacto,
        telefono: editando.telefono,
        email: editando.email,
        nit: editando.nit,
        direccion: editando.direccion,
        notas: editando.notas,
      }),
    });
    const data = await res.json();
    setGuardando(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo guardar el proveedor");
      return;
    }
    setEditando(null);
    cargar();
  }

  function abrirPago(p: Proveedor) {
    setPagoDe(p);
    setMonto("");
    setFormaPago("EFECTIVO");
    setNota("");
    setError(null);
  }

  async function registrarPago(e: FormEvent) {
    e.preventDefault();
    if (!pagoDe) return;
    setError(null);
    setGuardando(true);
    const res = await apiFetch("/api/proveedores/pagos", {
      method: "POST",
      body: JSON.stringify({ proveedorId: pagoDe.id, monto: Number(monto), formaPago, nota: nota || undefined }),
    });
    const data = await res.json();
    setGuardando(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo registrar el pago");
      return;
    }
    setPagoDe(null);
    cargar();
  }

  return (
    <div>
      <PageHeader
        title="Proveedores"
        description="Directorio de proveedores y cuentas por pagar"
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
              <Plus className="h-4 w-4" /> Nuevo proveedor
            </Button>
          )
        }
      />

      <div className="mb-4 max-w-xs">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            aria-label="Buscar proveedores por nombre o NIT"
            placeholder="Buscar por nombre o NIT..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>
      </div>

      {cargando ? (
        <TableSkeleton columnas={5} />
      ) : (
        <TableShell>
          <Thead>
            <tr>
              <Th>Nombre</Th>
              <Th>Contacto</Th>
              <Th>NIT</Th>
              <Th>Saldo por pagar</Th>
              {esAdmin && <Th />}
            </tr>
          </Thead>
          <tbody>
            {proveedores.map((p) => (
              <Tr key={p.id}>
                <Td>
                  <p className="font-medium text-slate-900">{p.nombre}</p>
                  {!p.activo && <Badge tono="neutral">Inactivo</Badge>}
                </Td>
                <Td>{p.contacto ?? p.telefono ?? "—"}</Td>
                <Td>{p.nit ?? "—"}</Td>
                <Td>
                  {Number(p.saldoDeuda) > 0 ? (
                    <Badge tono="warning">{formatoMoneda(p.saldoDeuda)}</Badge>
                  ) : (
                    <span className="text-slate-400">Al día</span>
                  )}
                </Td>
                {esAdmin && (
                  <Td>
                    <div className="flex justify-end gap-1">
                      {Number(p.saldoDeuda) > 0 && (
                        <button
                          onClick={() => abrirPago(p)}
                          aria-label={`Registrar pago a ${p.nombre}`}
                          title="Registrar pago"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                        >
                          <Wallet className="h-4 w-4" />
                        </button>
                      )}
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
                    </div>
                  </Td>
                )}
              </Tr>
            ))}
            {proveedores.length === 0 && <EmptyRow colSpan={esAdmin ? 5 : 4}>Aún no hay proveedores registrados.</EmptyRow>}
          </tbody>
        </TableShell>
      )}

      <Modal open={modalNuevo} onClose={() => setModalNuevo(false)} title="Nuevo proveedor">
        <form onSubmit={crearProveedor} className="space-y-4">
          <TextField label="Nombre" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Contacto" value={form.contacto} onChange={(e) => setForm({ ...form, contacto: e.target.value })} />
            <TextField label="Teléfono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Correo" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <TextField label="NIT" value={form.nit} onChange={(e) => setForm({ ...form, nit: e.target.value })} />
          </div>
          <TextField label="Dirección" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
          <TextField label="Notas" value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} />

          {error && <Alert>{error}</Alert>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variante="secondary" onClick={() => setModalNuevo(false)}>
              Cancelar
            </Button>
            <Button type="submit" cargando={guardando}>
              Guardar proveedor
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editando} onClose={() => setEditando(null)} title="Editar proveedor">
        {editando && (
          <form onSubmit={guardarEdicion} className="space-y-4">
            <TextField label="Nombre" required value={editando.nombre} onChange={(e) => setEditando({ ...editando, nombre: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Contacto" value={editando.contacto ?? ""} onChange={(e) => setEditando({ ...editando, contacto: e.target.value })} />
              <TextField label="Teléfono" value={editando.telefono ?? ""} onChange={(e) => setEditando({ ...editando, telefono: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Correo" type="email" value={editando.email ?? ""} onChange={(e) => setEditando({ ...editando, email: e.target.value })} />
              <TextField label="NIT" value={editando.nit ?? ""} onChange={(e) => setEditando({ ...editando, nit: e.target.value })} />
            </div>
            <TextField label="Dirección" value={editando.direccion ?? ""} onChange={(e) => setEditando({ ...editando, direccion: e.target.value })} />
            <TextField label="Notas" value={editando.notas ?? ""} onChange={(e) => setEditando({ ...editando, notas: e.target.value })} />

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

      <Modal open={!!pagoDe} onClose={() => setPagoDe(null)} title={`Registrar pago — ${pagoDe?.nombre ?? ""}`}>
        {pagoDe && (
          <form onSubmit={registrarPago} className="space-y-4">
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Saldo pendiente: <span className="font-semibold tabular-nums">{formatoMoneda(pagoDe.saldoDeuda)}</span>
            </p>
            <TextField label="Monto" type="number" min={0.01} step="0.01" max={pagoDe.saldoDeuda} required value={monto} onChange={(e) => setMonto(e.target.value)} />
            <SelectField label="Forma de pago" value={formaPago} onChange={(e) => setFormaPago(e.target.value as typeof formaPago)}>
              <option value="EFECTIVO">Efectivo</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="TARJETA">Tarjeta</option>
              <option value="OTRO">Otro</option>
            </SelectField>
            <TextField label="Nota (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} />

            {error && <Alert>{error}</Alert>}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variante="secondary" onClick={() => setPagoDe(null)}>
                Cancelar
              </Button>
              <Button type="submit" cargando={guardando}>
                Registrar pago
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
