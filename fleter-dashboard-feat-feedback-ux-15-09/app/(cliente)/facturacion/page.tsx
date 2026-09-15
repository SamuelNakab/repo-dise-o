"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileDown, Receipt } from "lucide-react";
import { api } from "@/lib/api";
import { formatARS, fmtDate } from "@/lib/utils";
import { separarDireccion, fmtHora24 } from "@/lib/viajes";
import type { MesComprobantes } from "@/lib/facturacion-cliente";

/**
 * Facturación — versión "comprobantes por mes" (15-09). Cómo se cobra sigue
 * ABIERTO (`OPEN.md` → D3): no hay saldo, cuenta corriente ni factura. El total
 * del mes lo arma el BFF y está rotulado como informativo.
 */
export default function FacturacionPage() {
  const [meses, setMeses] = useState<MesComprobantes[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [abriendo, setAbriendo] = useState<number | null>(null);
  const [remitoError, setRemitoError] = useState<{ id: number; msg: string } | null>(null);

  useEffect(() => {
    fetch(`/api/facturacion/cliente?tz=${new Date().getTimezoneOffset()}`)
      .then((r) => { if (!r.ok) throw new Error(`Error ${r.status}`); return r.json() as Promise<{ meses: MesComprobantes[] }>; })
      .then((d) => setMeses(d.meses))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Error al cargar los comprobantes"));
  }, []);

  async function abrirRemito(id: number) {
    setAbriendo(id);
    setRemitoError(null);
    try {
      const { remito_url } = await api.get<{ remito_url: string }>(`/api/viajes/${id}/remito`);
      window.open(remito_url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setRemitoError({ id, msg: e instanceof Error ? e.message : "No se pudo obtener el remito" });
    } finally {
      setAbriendo(null);
    }
  }

  return (
    <div className="page-wide">
      <div className="section-header">
        <div>
          <h2>Facturación</h2>
          <p>Remitos de tus viajes finalizados, mes por mes</p>
        </div>
      </div>

      <p className="note" style={{ marginBottom: 18 }}>
        Todavía no emitimos facturas ni liquidaciones mensuales. Acá tenés el remito de cada viaje y un
        total del mes para orientarte: es informativo y puede no coincidir con lo que se facture.
      </p>

      {error && <div className="error-banner">{error}</div>}

      {!meses && !error && (
        <div className="fact-month skeleton" />
      )}

      {meses && meses.length === 0 && (
        <div className="empty-state">
          <div className="empty-state__icon"><Receipt size={24} /></div>
          <p className="empty-state__title">Todavía no hay comprobantes</p>
          <p className="empty-state__text">Cuando un viaje se cierre vas a ver acá su remito y el precio final.</p>
        </div>
      )}

      {meses?.map((m) => (
        <section className="fact-month" key={m.clave}>
          <header className="fact-month__head">
            <div>
              <p className="fact-month__title">
                {(() => {
                  const s = new Date(m.anio, m.mes, 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
                  return s.charAt(0).toUpperCase() + s.slice(1);
                })()}
              </p>
              <p className="fact-month__count">
                {m.comprobantes.length} viaje{m.comprobantes.length !== 1 ? "s" : ""} finalizado{m.comprobantes.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="fact-month__total">
              <p className="fact-month__total-value">{formatARS(m.total_informativo)}</p>
              <p className="fact-month__nota">Informativo · no es una liquidación ni una factura</p>
            </div>
          </header>
          {m.comprobantes.map((c) => (
            <div key={c.id_viaje}>
              <div className="fact-row">
                <div className="fact-row__fecha">
                  <div>{fmtDate(c.fecha)}</div>
                  <div>{fmtHora24(c.fecha)} h</div>
                </div>
                <div className="fact-row__ruta">
                  <div>{c.origen ? separarDireccion(c.origen).calle : "—"}</div>
                  <div>→ {c.destino ? separarDireccion(c.destino).calle : "—"}</div>
                </div>
                <Link href={`/viajes/${c.id_viaje}`} className="trip-row__id">VJ-{c.id_viaje}</Link>
                <span className="fact-row__monto">{formatARS(c.precio_real)}</span>
                <button type="button" className="btn" onClick={() => abrirRemito(c.id_viaje)} disabled={abriendo === c.id_viaje}>
                  <FileDown size={14} /> {abriendo === c.id_viaje ? "Abriendo..." : "Remito"}
                </button>
              </div>
              {remitoError?.id === c.id_viaje && (
                <p className="fact-row__error">{remitoError.msg}</p>
              )}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
