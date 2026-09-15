"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePeriodo } from "@/hooks/usePeriodo";
import PeriodoSelector, { etiquetaPeriodo } from "@/components/PeriodoSelector";
import { formatARS, formatDuracion } from "@/lib/utils";
import { separarDireccion } from "@/lib/viajes";
import type { ResumenCliente, Extremo } from "@/lib/analytics-cliente";

function SkeletonCard({ span = 3, h = 118 }: { span?: number; h?: number }) {
  return (
    <div className={`card span-${span}`} style={{ minHeight: h }}>
      <div className="skeleton-line" />
      <div className="skeleton-line skeleton-line--valor" />
    </div>
  );
}

const COMPARACION: Record<string, string> = {
  semanal: "vs. semana anterior",
  mensual: "vs. mes anterior",
  personalizado: "vs. período anterior",
};

/** Variación sin juicio de color: gastar más no es "malo" por sí solo. */
function Variacion({ pct, vista }: { pct: number | null; vista: string }) {
  if (pct == null || vista === "todo") return null;
  const flecha = pct > 0 ? "↑" : pct < 0 ? "↓" : "=";
  return (
    <>
      <span className="delta delta--flat">{flecha} {Math.abs(pct)} %</span>
      <span>{COMPARACION[vista]}</span>
    </>
  );
}

function Pesos({ n }: { n: number | null }) {
  if (n == null) return <span className="muted">—</span>;
  return <><sup>$</sup>{n.toLocaleString("es-AR")}</>;
}

function ExtremoCard({ titulo, e }: { titulo: string; e: Extremo | null }) {
  return (
    <div className="card span-4 kpi">
      <p className="metric__label">{titulo}</p>
      <p className="metric__value"><Pesos n={e?.monto ?? null} /></p>
      {e ? (
        <div className="extreme">
          <div className="extreme__text">
            <div className="extreme__route">
              {e.origen ? separarDireccion(e.origen).calle : "—"} → {e.destino ? separarDireccion(e.destino).calle : "—"}
            </div>
            <div className="extreme__id">VJ-{e.id_viaje}</div>
          </div>
          <Link href={`/viajes/${e.id_viaje}`} className="extreme__btn">Ver detalle →</Link>
        </div>
      ) : (
        <p className="kpi__foot">Sin viajes finalizados en el período</p>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { periodo, queryParams } = usePeriodo();
  const [resumen, setResumen] = useState<ResumenCliente | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Al cambiar el período se vuelve a mostrar el estado de carga. Se ajusta
  // durante el render (patrón de React) en vez de llamar setState en el efecto.
  const fetchKey = JSON.stringify(queryParams) + `|${periodo.mode}`;
  const [prevFetchKey, setPrevFetchKey] = useState(fetchKey);
  if (fetchKey !== prevFetchKey) {
    setPrevFetchKey(fetchKey);
    setLoading(true);
    setError(null);
  }

  useEffect(() => {
    const params = new URLSearchParams();
    if ("desde" in queryParams) {
      params.set("desde", queryParams.desde);
      params.set("hasta", queryParams.hasta);
    }
    params.set("vista", periodo.mode);
    params.set("tz", String(new Date().getTimezoneOffset()));
    fetch(`/api/analytics/cliente/resumen?${params}`)
      .then((r) => { if (!r.ok) throw new Error(`Error ${r.status}`); return r.json() as Promise<ResumenCliente>; })
      .then(setResumen)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [queryParams, periodo.mode]);

  const r = resumen;
  const maxViajes = r ? Math.max(1, ...r.serie.map((b) => b.solicitados)) : 1;
  const maxGasto = r ? Math.max(1, ...r.serie.map((b) => b.gasto)) : 1;
  const totalZonaGasto = r ? (r.gasto_por_zona.CABA + r.gasto_por_zona.PROVINCIA + r.gasto_por_zona.MIXTO) || 1 : 1;
  const pctFinalizados = r && r.cantidad_fletes > 0 ? Math.round((r.finalizados / r.cantidad_fletes) * 100) : 0;

  return (
    <div>
      <div className="section-header section-header--wrap">
        <div>
          <h2>Analytics</h2>
          <p>Resumen de {etiquetaPeriodo(periodo.mode, periodo.desde, periodo.hasta)}</p>
        </div>
        <PeriodoSelector conTodo />
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Fila 1 — lo que más se mira: cuánto, cuántos, a qué precio, con qué servicio */}
      <div className="grid-12 grid-row">
        {loading || !r ? (
          <><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
        ) : (
          <>
            <div className="card span-3 card--ink kpi">
              <p className="metric__label">Total gastado</p>
              <p className="metric__value"><Pesos n={r.total_gastado} /></p>
              <p className="kpi__foot"><Variacion pct={r.variacion.total_gastado} vista={r.vista} /></p>
            </div>
            <div className="card span-3 kpi">
              <p className="metric__label">Fletes finalizados</p>
              <p className="metric__value">
                {r.finalizados}
                <small>de {r.cantidad_fletes} solicitados</small>
              </p>
              <div className="progress" aria-hidden="true"><div className="progress__fill" style={{ width: `${pctFinalizados}%` }} /></div>
              <p className="kpi__foot">
                {r.cancelados > 0 ? `${r.cancelados} cancelado${r.cancelados !== 1 ? "s" : ""}` : "Sin cancelaciones"}
              </p>
            </div>
            <div className="card span-3 kpi">
              <p className="metric__label">Costo promedio</p>
              <p className="metric__value"><Pesos n={r.costo_promedio} /></p>
              <p className="kpi__foot"><Variacion pct={r.variacion.costo_promedio} vista={r.vista} /></p>
            </div>
            <div className="card span-3 kpi">
              <p className="metric__label">Puntualidad</p>
              <p className="metric__value">
                {r.puntualidad.porcentaje_a_tiempo != null ? <>{r.puntualidad.porcentaje_a_tiempo}<small>%</small></> : <span className="muted">—</span>}
              </p>
              <p className="kpi__foot">
                {r.puntualidad.medidos > 0
                  ? `${r.puntualidad.a_tiempo} de ${r.puntualidad.medidos} arrancaron a tiempo`
                  : "Sin viajes iniciados en el período"}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Fila 2 — evolución y dónde se va la plata */}
      <div className="grid-12 grid-row">
        {loading || !r ? (
          <><SkeletonCard span={8} h={260} /><SkeletonCard span={4} h={260} /></>
        ) : (
          <>
            <div className="card span-8">
              <div className="card-head">
                <div>
                  <p className="card-title">Evolución</p>
                  <p className="card-sub">Viajes solicitados y gasto de los finalizados</p>
                </div>
                <div className="leyenda">
                  <span className="leyenda__item"><span className="leyenda__swatch leyenda__swatch--viajes" />Viajes</span>
                  <span className="leyenda__item"><span className="leyenda__swatch leyenda__swatch--gasto" />Gasto</span>
                </div>
              </div>
              {r.serie.length === 0 ? (
                <div className="empty">Sin datos para graficar</div>
              ) : (
                <div className="bars bars--dual" style={{ gridTemplateColumns: `repeat(${r.serie.length}, 1fr)`, gap: r.serie.length > 10 ? 6 : 14 }}>
                  {r.serie.map((b) => (
                    <div className="bar" key={b.desde}>
                      <span className="bar__tip">{b.solicitados} viaje{b.solicitados !== 1 ? "s" : ""} · {formatARS(b.gasto)}</span>
                      <div className="bar__pair">
                        <div className="bar__col--viajes" style={{ height: `${(b.solicitados / maxViajes) * 100}%` }} />
                        <div className="bar__col--gasto" style={{ height: `${(b.gasto / maxGasto) * 100}%` }} />
                      </div>
                      <span className="bar__label">{b.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card span-4">
              <p className="card-title">Gasto por zona</p>
              <p className="card-sub">Pesos de los finalizados · cantidad de viajes</p>
              {([
                { zone: "CABA", cls: "" },
                { zone: "PROVINCIA", cls: "zone-fill--prov" },
                { zone: "MIXTO", cls: "zone-fill--mixto" },
              ] as const).map((z) => (
                <div className="zone-row zone-row--rich" key={z.zone}>
                  <span className="zone-name">{z.zone === "PROVINCIA" ? "Provincia" : z.zone === "MIXTO" ? "Mixto" : "CABA"}</span>
                  <div className="zone-track">
                    <div className={`zone-fill ${z.cls}`} style={{ width: `${(r.gasto_por_zona[z.zone] / totalZonaGasto) * 100}%` }} />
                  </div>
                  <span className="zone-amount">
                    {formatARS(r.gasto_por_zona[z.zone])}
                    <small>{r.por_zona[z.zone]} viaje{r.por_zona[z.zone] !== 1 ? "s" : ""}</small>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Fila 3 — extremos y calidad del servicio */}
      <div className="grid-12 grid-row">
        {loading || !r ? (
          <><SkeletonCard span={4} /><SkeletonCard span={4} /><SkeletonCard span={4} /></>
        ) : (
          <>
            <ExtremoCard titulo="Flete más caro" e={r.flete_mas_caro} />
            <ExtremoCard titulo="Flete más barato" e={r.flete_mas_barato} />
            <div className="card span-4 kpi">
              <p className="metric__label">Servicio</p>
              <div className="mini-stats">
                <div>
                  <p className="mini-stat__label">Cancelación</p>
                  <p className="mini-stat__value">{r.tasa_cancelacion != null ? `${r.tasa_cancelacion} %` : "—"}</p>
                </div>
                <div>
                  <p className="mini-stat__label">Duración prom.</p>
                  <p className="mini-stat__value">{formatDuracion(r.duracion_promedio)}</p>
                </div>
              </div>
              <p className="kpi__foot">
                {r.alertas_disponible
                  ? `${r.alertas_count} alerta${r.alertas_count !== 1 ? "s" : ""} de desvío o parada`
                  : "Alertas: el backend todavía no informa el conteo por viaje"}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Fila 4 — destinos */}
      {!loading && r && r.top_destinos.length > 0 && (
        <div className="grid-12">
          <div className="card span-12">
            <p className="card-title">Destinos frecuentes</p>
            <p className="card-sub">Direcciones a las que más viajes pediste en el período</p>
            {r.top_destinos.map((d, i) => {
              const { calle, localidad } = separarDireccion(d.direccion);
              return (
                <div className="dest-row" key={d.direccion}>
                  <div className="dest-rank">{String(i + 1).padStart(2, "0")}</div>
                  <div>
                    <div className="dest-addr">{calle}</div>
                    <div className="dest-zone">{[localidad, d.zona].filter(Boolean).join(" · ")}</div>
                  </div>
                  <div className="dest-count">{d.count}<small>viajes</small></div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
