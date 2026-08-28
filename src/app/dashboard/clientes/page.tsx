"use client";

import { useEffect, useState, FormEvent } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatoMoneda } from "@/lib/format";
import { useSesion } from "../SesionContext";
import {
  PageHeader,
  Button,
  TextField,
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

interface Cliente {
  id: string;
  nombre: string;
  contacto: string | null;
  email: string | null;
  documento: string | null;
  direccion: string | null;
  limiteCredito: string | null;
  saldoDeuda: string;
  activo: boolean;
}

const FORM_VACIO = { nombre: "", contacto: "", email: "", documento: "", direccion: "", limiteCredito: "" };

export default function ClientesPage() {
  const { esAdmin } = useSesion();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [modalNuevo, setModalNuevo] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [editando, setEditando] = useState<Cliente | null>(null);

  async function cargar() {
    setCargando(true);
    const res = await apiFetch(`/api/clientes?limite=200${busqueda ? `&q=${encodeURIComponent(busqueda)}` : ""}`);
    const data = await res.json();
    setClientes(data.clientes ?? []);
    setCargando(false);
  }

  useEffect(() => {
    const timeout = setTimeout(cargar, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda]);

  async function crearCliente(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    const res = await apiFetch("/api/clientes", {
      method: "POST",
      body: JSON.stringify({
        nombre: form.nombre,
        contacto: form.contacto || undefined,
        email: form.email || undefined,
        documento: form.documento || undefined,
        direccion: form.direccion || undefined,
        limiteCredito: form.limiteCredito ? Number(form.limiteCredito) : undefined,
      }),
    });
    const data = await res.json();
    setGuardando(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo crear el cliente");
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
    const res = await apiFetch(`/api/clientes/${editando.id}`, {
      method: "PUT",
      body: JSON.stringify({
        nombre: editando.nombre,
        contacto: editando.contacto || null,
        email: editando.email || null,
        documento: editando.documento || null,
        direccion: editando.direccion || null,
        limiteCredito: editando.limiteCredito ? Number(editando.limiteCredito) : null,
      }),
    });
    const data = await res.json();
    setGuardando(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo guardar el cliente");
      return;
    }
    setEditando(null);
    cargar();
  }

  async function eliminarCliente(c: Cliente) {
    if (!window.confirm(`¿Eliminar o desactivar a "${c.nombre}"?`)) return;
    const res = await apiFetch(`/api/clientes/${c.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      window.alert(data.error ?? "No se pudo eliminar el cliente");
      return;
    }
    cargar();
  }

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Directorio de clientes y su saldo fiado"
        actions={
          <Button
            variante="accent"
            onClick={() => {
              setForm(FORM_VACIO);
              setError(null);
              setModalNuevo(true);
            }}
          >
            <Plus className="h-4 w-4" /> Nuevo cliente
          </Button>
        }
      />

      <div className="mb-4 max-w-xs">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            aria-label="Buscar clientes por nombre, contacto o documento"
            placeholder="Buscar por nombre, contacto o documento..."
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
              <Th>Documento</Th>
              <Th>Saldo (fiado)</Th>
              <Th />
            </tr>
          </Thead>
          <tbody>
            {clientes.map((c) => (
              <Tr key={c.id}>
                <Td>
                  <p className="font-medium text-slate-900">{c.nombre}</p>
                  {!c.activo && <Badge tono="neutral">Inactivo</Badge>}
                </Td>
                <Td>{c.contacto ?? "—"}</Td>
                <Td>{c.documento ?? "—"}</Td>
                <Td>
                  {Number(c.saldoDeuda) > 0 ? (
                    <Badge tono="warning">{formatoMoneda(c.saldoDeuda)}</Badge>
                  ) : (
                    <span className="text-slate-400">Sin deuda</span>
                  )}
                </Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => {
                        setError(null);
                        setEditando(c);
                      }}
                      aria-label={`Editar ${c.nombre}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {esAdmin && (
                      <button
                        onClick={() => eliminarCliente(c)}
                        aria-label={`Eliminar ${c.nombre}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-danger-50 hover:text-danger-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
            {clientes.length === 0 && <EmptyRow colSpan={5}>Aún no hay clientes registrados.</EmptyRow>}
          </tbody>
        </TableShell>
      )}

      <Modal open={modalNuevo} onClose={() => setModalNuevo(false)} title="Nuevo cliente">
        <form onSubmit={crearCliente} className="space-y-4">
          <TextField label="Nombre" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Contacto" placeholder="Teléfono" value={form.contacto} onChange={(e) => setForm({ ...form, contacto: e.target.value })} />
            <TextField label="Documento" value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} />
          </div>
          <TextField label="Correo (opcional)" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <TextField label="Dirección (opcional)" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
          <TextField
            label="Límite de crédito (opcional)"
            type="number"
            min={0}
            hint="Tope de fiado permitido. Déjalo vacío para no limitar."
            value={form.limiteCredito}
            onChange={(e) => setForm({ ...form, limiteCredito: e.target.value })}
          />

          {error && <Alert>{error}</Alert>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variante="secondary" onClick={() => setModalNuevo(false)}>
              Cancelar
            </Button>
            <Button type="submit" cargando={guardando}>
              Guardar cliente
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editando} onClose={() => setEditando(null)} title="Editar cliente">
        {editando && (
          <form onSubmit={guardarEdicion} className="space-y-4">
            <TextField label="Nombre" required value={editando.nombre} onChange={(e) => setEditando({ ...editando, nombre: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Contacto" value={editando.contacto ?? ""} onChange={(e) => setEditando({ ...editando, contacto: e.target.value })} />
              <TextField label="Documento" value={editando.documento ?? ""} onChange={(e) => setEditando({ ...editando, documento: e.target.value })} />
            </div>
            <TextField label="Correo" type="email" value={editando.email ?? ""} onChange={(e) => setEditando({ ...editando, email: e.target.value })} />
            <TextField label="Dirección" value={editando.direccion ?? ""} onChange={(e) => setEditando({ ...editando, direccion: e.target.value })} />
            <TextField
              label="Límite de crédito"
              type="number"
              min={0}
              value={editando.limiteCredito ?? ""}
              onChange={(e) => setEditando({ ...editando, limiteCredito: e.target.value })}
            />

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
