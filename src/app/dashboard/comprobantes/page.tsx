"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { Plus, Eye, Send, Printer, ExternalLink } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatoMoneda, formatoFechaHora } from "@/lib/format";
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
  EmptyState,
} from "@/app/components/ui";

type TipoComprobante = "TICKET" | "FACTURA" | "RECIBO" | "COTIZACION" | "COMPROBANTE_ABONO";
type MedioEnvio = "WHATSAPP" | "EMAIL" | "SMS" | "DESCARGA";

interface Comprobante {
  id: string;
  tipo: TipoComprobante;
  folio: string;
  total: string;
  estado: "EMITIDO" | "ANULADO";
  createdAt: string;
  enviadoA: string | null;
  medioEnvio: MedioEnvio | null;
  ventaId: string | null;
  abonoId: string | null;
  usuario: { nombre: string };
}
interface VentaOpcion {
  id: string;
  numero: number;
  total: string;
  createdAt: string;
  cliente: { nombre: string } | null;
}
interface AbonoOpcion {
  id: string;
  numero: number;
  monto: string;
  createdAt: string;
  cliente: { nombre: string };
}

const ETIQUETA_TIPO: Record<TipoComprobante, string> = {
  TICKET: "Ticket",
  FACTURA: "Factura",
  RECIBO: "Recibo",
  COTIZACION: "Cotización",
  COMPROBANTE_ABONO: "Comprobante de abono",
};

const ETIQUETA_MEDIO: Record<MedioEnvio, string> = {
  WHATSAPP: "WhatsApp",
  EMAIL: "Correo",
  SMS: "SMS",
  DESCARGA: "Descarga",
};

export default function ComprobantesPage() {
  const [comprobantes, setComprobantes] = useState<Comprobante[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Nuevo comprobante ---
  const [modalNuevo, setModalNuevo] = useState(false);
  const [ventas, setVentas] = useState<VentaOpcion[]>([]);
  const [abonos, setAbonos] = useState<AbonoOpcion[]>([]);
  const [origen, setOrigen] = useState<"venta" | "abono">("venta");
  const [tipo, setTipo] = useState<Exclude<TipoComprobante, "COMPROBANTE_ABONO">>("TICKET");
  const [origenId, setOrigenId] = useState("");
  const [emitiendo, setEmitiendo] = useState(false);

  // --- Ver / imprimir ---
  const [viendoId, setViendoId] = useState<string | null>(null);
  const [htmlComprobante, setHtmlComprobante] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // --- Enviar ---
  const [enviando, setEnviando] = useState<Comprobante | null>(null);
  const [medio, setMedio] = useState<MedioEnvio>("WHATSAPP");
  const [destino, setDestino] = useState("");
  const [registrandoEnvio, setRegistrandoEnvio] = useState(false);
  const [enlaceWhatsapp, setEnlaceWhatsapp] = useState<string | null>(null);

  async function cargar() {
    setCargando(true);
    const res = await apiFetch("/api/comprobantes?limite=100");
    const data = await res.json();
    setComprobantes(data.comprobantes ?? []);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  async function abrirNuevo() {
    setError(null);
    setTipo("TICKET");
    setOrigen("venta");
    setOrigenId("");
    setModalNuevo(true);
    const [rv, ra] = await Promise.all([
      apiFetch("/api/ventas?limite=50"),
      apiFetch("/api/fiados/abonos?limite=50"),
    ]);
    setVentas((await rv.json()).ventas ?? []);
    setAbonos((await ra.json()).abonos ?? []);
  }

  async function emitir(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!origenId) {
      setError(origen === "venta" ? "Selecciona una venta" : "Selecciona un abono");
      return;
    }
    setEmitiendo(true);
    const res = await apiFetch("/api/comprobantes", {
      method: "POST",
      body: JSON.stringify({
        tipo,
        ventaId: origen === "venta" ? origenId : undefined,
        abonoId: origen === "abono" ? origenId : undefined,
      }),
    });
    const data = await res.json();
    setEmitiendo(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo emitir el comprobante");
      return;
    }
    setModalNuevo(false);
    cargar();
  }

  async function verComprobante(c: Comprobante) {
    setViendoId(c.id);
    setHtmlComprobante(null);
    const res = await apiFetch(`/api/comprobantes/${c.id}?formato=html`);
    setHtmlComprobante(await res.text());
  }

  function imprimir() {
    iframeRef.current?.contentWindow?.print();
  }

  function abrirEnviar(c: Comprobante) {
    setEnviando(c);
    setMedio("WHATSAPP");
    setDestino(c.enviadoA ?? "");
    setEnlaceWhatsapp(null);
    setError(null);
  }

  async function registrarEnvio(e: FormEvent) {
    e.preventDefault();
    if (!enviando) return;
    setError(null);
    setRegistrandoEnvio(true);
    const res = await apiFetch(`/api/comprobantes/${enviando.id}/enviar`, {
      method: "POST",
      body: JSON.stringify({ medio, destino }),
    });
    const data = await res.json();
    setRegistrandoEnvio(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo registrar el envío");
      return;
    }
    if (data.enlace) {
      setEnlaceWhatsapp(data.enlace);
    } else {
      setEnviando(null);
    }
    cargar();
  }

  return (
    <div>
      <PageHeader
        title="Comprobantes"
        description="Tickets, facturas, recibos y cotizaciones emitidos"
        actions={
          <Button variante="accent" onClick={abrirNuevo}>
            <Plus className="h-4 w-4" /> Nuevo comprobante
          </Button>
        }
      />

      {cargando ? (
        <TableSkeleton columnas={6} />
      ) : (
        <TableShell>
          <Thead>
            <tr>
              <Th>Folio</Th>
              <Th>Tipo</Th>
              <Th>Fecha</Th>
              <Th>Total</Th>
              <Th>Estado</Th>
              <Th>Envío</Th>
              <Th />
            </tr>
          </Thead>
          <tbody>
            {comprobantes.map((c) => (
              <Tr key={c.id}>
                <Td className="font-medium text-slate-900">{c.folio}</Td>
                <Td>
                  <Badge tono="brand">{ETIQUETA_TIPO[c.tipo]}</Badge>
                </Td>
                <Td className="whitespace-nowrap">{formatoFechaHora(c.createdAt)}</Td>
                <Td className="tabular-nums">{formatoMoneda(c.total)}</Td>
                <Td>
                  <Badge tono={c.estado === "EMITIDO" ? "success" : "danger"}>
                    {c.estado === "EMITIDO" ? "Emitido" : "Anulado"}
                  </Badge>
                </Td>
                <Td>
                  {c.medioEnvio ? (
                    <span className="text-xs text-slate-500">
                      {ETIQUETA_MEDIO[c.medioEnvio]} · {c.enviadoA}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">Sin enviar</span>
                  )}
                </Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => verComprobante(c)}
                      aria-label={`Ver ${c.folio}`}
                      title="Ver comprobante"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => abrirEnviar(c)}
                      aria-label={`Enviar ${c.folio}`}
                      title="Enviar comprobante"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </Td>
              </Tr>
            ))}
            {comprobantes.length === 0 && (
              <EmptyRow colSpan={7}>Aún no se han emitido comprobantes.</EmptyRow>
            )}
          </tbody>
        </TableShell>
      )}

      {/* Nuevo comprobante */}
      <Modal open={modalNuevo} onClose={() => setModalNuevo(false)} title="Nuevo comprobante">
        <form onSubmit={emitir} className="space-y-4">
          <SelectField
            label="Tipo de comprobante"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as typeof tipo)}
          >
            <option value="TICKET">Ticket</option>
            <option value="FACTURA">Factura</option>
            <option value="RECIBO">Recibo</option>
            <option value="COTIZACION">Cotización</option>
          </SelectField>

          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700">Origen</p>
            <div className="flex gap-4 text-sm text-slate-600">
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="origen"
                  checked={origen === "venta"}
                  onChange={() => {
                    setOrigen("venta");
                    setOrigenId("");
                  }}
                  className="h-4 w-4 border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                Una venta
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="origen"
                  checked={origen === "abono"}
                  onChange={() => {
                    setOrigen("abono");
                    setOrigenId("");
                  }}
                  className="h-4 w-4 border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                Un abono
              </label>
            </div>
          </div>

          {origen === "venta" ? (
            <SelectField label="Venta" value={origenId} onChange={(e) => setOrigenId(e.target.value)} required>
              <option value="">Selecciona una venta reciente</option>
              {ventas.map((v) => (
                <option key={v.id} value={v.id}>
                  #{v.numero} · {formatoMoneda(v.total)} · {v.cliente?.nombre ?? "Sin cliente"} ·{" "}
                  {formatoFechaHora(v.createdAt)}
                </option>
              ))}
            </SelectField>
          ) : (
            <SelectField label="Abono" value={origenId} onChange={(e) => setOrigenId(e.target.value)} required>
              <option value="">Selecciona un abono reciente</option>
              {abonos.map((a) => (
                <option key={a.id} value={a.id}>
                  #{a.numero} · {formatoMoneda(a.monto)} · {a.cliente.nombre} · {formatoFechaHora(a.createdAt)}
                </option>
              ))}
            </SelectField>
          )}

          {error && <Alert>{error}</Alert>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variante="secondary" onClick={() => setModalNuevo(false)}>
              Cancelar
            </Button>
            <Button type="submit" cargando={emitiendo}>
              Emitir comprobante
            </Button>
          </div>
        </form>
      </Modal>

      {/* Ver / imprimir */}
      <Modal open={!!viendoId} onClose={() => setViendoId(null)} title="Comprobante">
        {htmlComprobante === null ? (
          <div className="flex justify-center py-10 text-sm text-slate-400">Cargando comprobante…</div>
        ) : (
          <div>
            <iframe
              ref={iframeRef}
              title="Comprobante"
              srcDoc={htmlComprobante}
              sandbox="allow-same-origin"
              className="h-[60vh] w-full rounded-lg border border-slate-200"
            />
            <div className="mt-4 flex justify-end">
              <Button variante="secondary" onClick={imprimir}>
                <Printer className="h-4 w-4" /> Imprimir
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Enviar */}
      <Modal open={!!enviando} onClose={() => setEnviando(null)} title={`Enviar — ${enviando?.folio ?? ""}`}>
        {enviando &&
          (enlaceWhatsapp ? (
            <div className="space-y-4">
              <Alert tono="success">Envío registrado. Abre el enlace para completarlo por WhatsApp.</Alert>
              <a
                href={enlaceWhatsapp}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-lg bg-success-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-success-700"
              >
                <ExternalLink className="h-4 w-4" /> Abrir WhatsApp
              </a>
              <div className="flex justify-end">
                <Button variante="secondary" onClick={() => setEnviando(null)}>
                  Cerrar
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={registrarEnvio} className="space-y-4">
              <SelectField label="Medio de envío" value={medio} onChange={(e) => setMedio(e.target.value as MedioEnvio)}>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="EMAIL">Correo electrónico</option>
                <option value="SMS">SMS</option>
                <option value="DESCARGA">Descarga directa</option>
              </SelectField>
              <TextField
                label={medio === "EMAIL" ? "Correo del destinatario" : "Número o destino"}
                required
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
              />

              {error && <Alert>{error}</Alert>}

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variante="secondary" onClick={() => setEnviando(null)}>
                  Cancelar
                </Button>
                <Button type="submit" cargando={registrandoEnvio}>
                  Registrar envío
                </Button>
              </div>
            </form>
          ))}
      </Modal>

      {comprobantes.length === 0 && !cargando && (
        <div className="mt-4">
          <EmptyState title="Nada por aquí todavía" description="Emite tu primer comprobante desde una venta o un abono ya registrados." />
        </div>
      )}
    </div>
  );
}
