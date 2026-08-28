"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Building2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatoFecha, formatoFechaHora } from "@/lib/format";
import {
  PageHeader,
  StatTile,
  Badge,
  TableShell,
  Thead,
  Th,
  Tr,
  Td,
  EmptyRow,
  TableSkeleton,
} from "@/app/components/ui";

interface Negocio {
  id: string;
  nombre: string;
  tipoNegocio: string;
  fechaRegistro: string;
  totalVentas: number;
  ultimaActividad: string | null;
}

export default function SuperadminPage() {
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    apiFetch("/api/superadmin/negocios")
      .then((r) => r.json())
      .then((data) => setNegocios(data.negocios ?? []))
      .finally(() => setCargando(false));
  }, []);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return negocios;
    return negocios.filter((n) => n.nombre.toLowerCase().includes(q) || n.tipoNegocio.toLowerCase().includes(q));
  }, [negocios, busqueda]);

  const activosUltimos30Dias = negocios.filter(
    (n) => n.ultimaActividad && Date.now() - new Date(n.ultimaActividad).getTime() < 30 * 86_400_000
  ).length;

  return (
    <div>
      <PageHeader title="Negocios" description="Actividad general de todos los negocios registrados en la plataforma" />

      {!cargando && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatTile label="Negocios registrados" value={String(negocios.length)} icon={Building2} />
          <StatTile label="Activos (últimos 30 días)" value={String(activosUltimos30Dias)} />
          <StatTile label="Ventas totales acumuladas" value={String(negocios.reduce((acc, n) => acc + n.totalVentas, 0))} />
        </div>
      )}

      <div className="mb-4 max-w-xs">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            aria-label="Buscar negocios por nombre o tipo"
            placeholder="Buscar por nombre o tipo..."
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
              <Th>Negocio</Th>
              <Th>Tipo</Th>
              <Th>Registrado</Th>
              <Th>Ventas totales</Th>
              <Th>Última actividad</Th>
            </tr>
          </Thead>
          <tbody>
            {filtrados.map((n) => (
              <Tr key={n.id}>
                <Td className="font-medium text-slate-900">{n.nombre}</Td>
                <Td>{n.tipoNegocio}</Td>
                <Td>{formatoFecha(n.fechaRegistro)}</Td>
                <Td className="tabular-nums">{n.totalVentas}</Td>
                <Td>
                  {n.ultimaActividad ? (
                    formatoFechaHora(n.ultimaActividad)
                  ) : (
                    <Badge tono="neutral">Sin ventas aún</Badge>
                  )}
                </Td>
              </Tr>
            ))}
            {filtrados.length === 0 && <EmptyRow colSpan={5}>No hay negocios registrados todavía.</EmptyRow>}
          </tbody>
        </TableShell>
      )}
    </div>
  );
}
