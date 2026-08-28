"use client";

import { useEffect, useState, useReducer, FormEvent } from "react";
import { HandCoins, RotateCcw } from "lucide-react";
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

interface ClienteCartera {
  clienteId: string;
  nombre: string;
  contacto: string | null;
  saldoDeuda: number;
  limiteCredito: number | null;
  ventasPendientes: number;
  tramoAntiguedad: "0-30" | "31-60" | "61-90" | "90+" | null;
  deudaDesde: string | null;
}

const TRAMO_TONO: Record<string, "success" | "warning" | "danger"> = {
  "0-30": "success",
  "31-60": "warning",
  "61-90": "warning",
  "90+": "danger",
};

interface AbonoState {
  abonoDe: ClienteCartera | null;
  monto: string;
  formaPago: "EFECTIVO" | "TRANSFERENCIA" | "TARJETA" | "OTRO";
  nota: string;
  emitirComprobante: boolean;
  registrando: boolean;
  error: string | null;
}

type AbonoAction =
  | { type: "ABRIR_ABONO"; cliente: ClienteCartera }
  | { type: "CERRAR_ABONO" }
  | { type: "SET_MONTO"; monto: string }
  | { type: "SET_FORMA_PAGO"; formaPago: "EFECTIVO" | "TRANSFERENCIA" | "TARJETA" | "OTRO" }
  | { type: "SET_NOTA"; nota: string }
  | { type: "SET_COMPROBANTE"; emitirComprobante: boolean }
  | { type: "SET_REGISTRANDO"; registrando: boolean }
  | { type: "SET_ERROR"; error: string | null };

function abonoReducer(state: AbonoState, action: AbonoAction): AbonoState {
  switch (action.type) {
    case "ABRIR_ABONO":
      return { abonoDe: action.cliente, monto: "", formaPago: "EFECTIVO", nota: "", emitirComprobante: false, registrando: false, error: null };
    case "CERRAR_ABONO":
      return { ...state, abonoDe: null };
    case "SET_MONTO":
      return { ...state, monto: action.monto };
    case "SET_FORMA_PAGO":
      return { ...state, formaPago: action.formaPago };
    case "SET_NOTA":
      return { ...state, nota: action.nota };
    case "SET_COMPROBANTE":
      return { ...state, emitirComprobante: action.emitirComprobante };
    case "SET_REGISTRANDO":
      return { ...state, registrando: action.registrando };
    case "SET_ERROR":
      return { ...state, error: action.error };
  }
}

export default function FiadosPage() {
  const { esAdmin } = useSesion();
  const [cartera, setCartera] = useState<ClienteCartera[]>([]);
  const [totalCartera, setTotalCartera] = useState(0);
  const [porTramo, setPorTramo] = useState<Record<string, number>>({});
  const [cargando, setCargando] = useState(true);

  const [abono, dispatchAbono] = useReducer(abonoReducer, {
    abonoDe: null,
    monto: "",
    formaPago: "EFECTIVO",
    nota: "",
    emitirComprobante: false,
    registrando: false,
    error: null,
  });

  async function cargar() {
    setCargando(true);
    const res = await apiFetch("/api/fiados?limite=200");
    const data = await res.json();
    setCartera(data.clientes ?? []);
    setTotalCartera(data.totalCartera ?? 0);
    setPorTramo(data.porTramo ?? {});
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  function abrirAbono(c: ClienteCartera) {
    dispatchAbono({ type: "ABRIR_ABONO", cliente: c });
  }

  async function registrarAbono(e: FormEvent) {
    e.preventDefault();
    if (!abono.abonoDe) return;
    dispatchAbono({ type: "SET_ERROR", error: null });
    dispatchAbono({ type: "SET_REGISTRANDO", registrando: true });
    const res = await apiFetch("/api/fiados/abonos", {
      method: "POST",
      body: JSON.stringify({
        clienteId: abono.abonoDe.clienteId,
        monto: Number(abono.monto),
        formaPago: abono.formaPago,
        nota: abono.nota || undefined,
        emitirComprobante: abono.emitirComprobante,
      }),
    });
    const data = await res.json();
    dispatchAbono({ type: "SET_REGISTRANDO", registrando: false });
    if (!res.ok) {
      dispatchAbono({ type: "SET_ERROR", error: data.error ?? "No se pudo registrar el abono" });
      return;
    }
    dispatchAbono({ type: "CERRAR_ABONO" });
    cargar();
  }

  async function recalcular(c: ClienteCartera) {
    const res = await apiFetch("/api/fiados/recalcular", {
      method: "POST",
      body: JSON.stringify({ clienteId: c.clienteId }),
    });
    if (res.ok) cargar();
  }

  return (
    <div>
      <PageHeader title="Fiados" description="Cartera de cuentas por cobrar y registro de abonos" />

      {cargando ? (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatTile label="Cartera total" value={formatoMoneda(totalCartera)} icon={HandCoins} alerta={totalCartera > 0} />
          <StatTile label="0-30 días" value={formatoMoneda(porTramo["0-30"])} />
          <StatTile label="31-90 días" value={formatoMoneda((porTramo["31-60"] ?? 0) + (porTramo["61-90"] ?? 0))} />
          <StatTile label="Más de 90 días" value={formatoMoneda(porTramo["90+"])} alerta={(porTramo["90+"] ?? 0) > 0} />
        </div>
      )}

      {cargando ? (
        <TableSkeleton columnas={6} />
      ) : (
        <TableShell>
          <Thead>
            <tr>
              <Th>Cliente</Th>
              <Th>Saldo pendiente</Th>
              <Th>Límite de crédito</Th>
              <Th>Antigüedad</Th>
              <Th>Ventas pendientes</Th>
              <Th />
            </tr>
          </Thead>
          <tbody>
            {cartera.map((c) => (
              <Tr key={c.clienteId}>
                <Td>
                  <p className="font-medium text-slate-900">{c.nombre}</p>
                  {c.contacto && <p className="text-xs text-slate-400">{c.contacto}</p>}
                </Td>
                <Td className="tabular-nums font-medium">{formatoMoneda(c.saldoDeuda)}</Td>
                <Td className="tabular-nums">{c.limiteCredito ? formatoMoneda(c.limiteCredito) : "Sin límite"}</Td>
                <Td>
                  {c.tramoAntiguedad && (
                    <Badge tono={TRAMO_TONO[c.tramoAntiguedad]}>
                      {c.tramoAntiguedad} días{c.deudaDesde ? ` · desde ${formatoFecha(c.deudaDesde)}` : ""}
                    </Badge>
                  )}
                </Td>
                <Td className="tabular-nums">{c.ventasPendientes}</Td>
                <Td>
                  <div className="flex justify-end gap-2">
                    <Button tamano="sm" onClick={() => abrirAbono(c)}>
                      Registrar abono
                    </Button>
                    {esAdmin && (
                      <button
                        onClick={() => recalcular(c)}
                        aria-label={`Recalcular saldo de ${c.nombre}`}
                        title="Recalcular saldo"
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
            {cartera.length === 0 && <EmptyRow colSpan={6}>Ningún cliente tiene saldo pendiente. ¡Cartera al día!</EmptyRow>}
          </tbody>
        </TableShell>
      )}

      <Modal open={!!abono.abonoDe} onClose={() => dispatchAbono({ type: "CERRAR_ABONO" })} title={`Registrar abono — ${abono.abonoDe?.nombre ?? ""}`}>
        {abono.abonoDe && (
          <form onSubmit={registrarAbono} className="space-y-4">
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Saldo pendiente actual: <span className="font-semibold tabular-nums">{formatoMoneda(abono.abonoDe.saldoDeuda)}</span>
            </p>
            <TextField
              label="Monto del abono"
              type="number"
              min={0.01}
              step="0.01"
              max={abono.abonoDe.saldoDeuda}
              required
              value={abono.monto}
              onChange={(e) => dispatchAbono({ type: "SET_MONTO", monto: e.target.value })}
            />
            <SelectField label="Forma de pago" value={abono.formaPago} onChange={(e) => dispatchAbono({ type: "SET_FORMA_PAGO", formaPago: e.target.value as typeof abono.formaPago })}>
              <option value="EFECTIVO">Efectivo</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="TARJETA">Tarjeta</option>
              <option value="OTRO">Otro</option>
            </SelectField>
            <TextField label="Nota (opcional)" value={abono.nota} onChange={(e) => dispatchAbono({ type: "SET_NOTA", nota: e.target.value })} />
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={abono.emitirComprobante} onChange={(e) => dispatchAbono({ type: "SET_COMPROBANTE", emitirComprobante: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
              Emitir comprobante de abono
            </label>

            {abono.error && <Alert>{abono.error}</Alert>}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variante="secondary" onClick={() => dispatchAbono({ type: "CERRAR_ABONO" })}>
                Cancelar
              </Button>
              <Button type="submit" cargando={abono.registrando}>
                Registrar abono
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
