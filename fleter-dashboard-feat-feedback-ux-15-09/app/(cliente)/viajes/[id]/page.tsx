"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Radio, FileDown, Star } from "lucide-react";
import { api } from "@/lib/api";
import { formatARS, fmtDate, fmtTime, formatDuracion } from "@/lib/utils";
import { ESTADO_LABEL, esFinalizado, esEnCurso, esProximo } from "@/lib/estados";
import { ordenarParadas, separarDireccion, formatKm, fmtDiaLargo, fmtHora24, PUNTUALIDAD_LABEL } from "@/lib/viajes";
import { etiquetaTipoVehiculo, etiquetaCondicion } from "@/lib/vehiculos";
import MapaRuta from "@/components/MapaRuta";
import ContactoConductor from "@/components/ContactoConductor";

interface Parada {
  orden: number;
  direccion: string;
  latitud?: number | null;
  longitud?: number | null;
  estado?: "PENDIENTE" | "ENTREGADO";
  /** El contrato la llama `fecha_entrega`. La página leía `hora_entrega`, que no existe. */
  fecha_entrega?: string | null;
}

interface Alerta {
  tipo: string;
  descripcion: string;
  creado_en: string;
}

/** Forma de `GET /api/viajes/:id` (contrato, incluidos los cambios de Fase 5). */
interface ViajeDetalle {
  id_viaje: number;
  zona: "CABA" | "PROVINCIA" | "MIXTO";
  precio_estimado: number;
  precio_real: number | null;
  descripcion?: string | null;
  estado: string;
  fecha_programada: string;
  fecha_inicio?: string | null;
  puntualidad_inicio?: "A_TIEMPO" | "TARDE" | "MUY_TARDE" | null;
  creado_en: string;
  /** Minutos enteros. `null` en viajes viejos o si Google Maps falló al crearlo. */
  duracion_estimada?: number | null;
  duracion_real?: number | null;
  /** No está en el contrato: pedido al backend (PEDIDO-BACKEND → J). */
  km_reales?: number | null;
  /** No está en el contrato: pedido al backend (PEDIDO-BACKEND → J). */
  alertas?: Alerta[];
  paradas: Parada[];
  condiciones_req?: { condicion: string }[];
  conductor: {
    calificacion_promedio?: number | null;
    usuario: { nombre: string; apellido: string; telefono?: string | null };
  } | null;
  /** `null` mientras no haya conductor asignado. La clave siempre viene. */
  vehiculo?: {
    patente: string;
    marca: string;
    modelo: string;
    tipo_vehiculo: string;
    anio?: number;
    color?: string;
  } | null;
  empresa?: { nombre: string } | null;
  ruta_planeada?: [number, number][] | null;
  calificacion?: { puntaje: number; comentario: string | null } | null;
}

function initials(nombre: string, apellido: string): string {
  return `${nombre[0] ?? ""}${apellido[0] ?? ""}`.toUpperCase();
}

export default function ViajeDetallePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [viaje, setViaje] = useState<ViajeDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kmRuta, setKmRuta] = useState<number | null>(null);
  const [remitoLoading, setRemitoLoading] = useState(false);
  const [remitoError, setRemitoError] = useState<string | null>(null);

  /**
   * El endpoint no devuelve el PDF sino JSON `{ remito_url }` con una URL
   * pública de R2. Hay que pedirlo con `api` (que agrega BASE_URL y el
   * Authorization) y recién después abrir esa URL.
   */
  async function abrirRemito() {
    setRemitoLoading(true);
    setRemitoError(null);
    try {
      const { remito_url } = await api.get<{ remito_url: string }>(`/api/viajes/${id}/remito`);
      window.open(remito_url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setRemitoError(e instanceof Error ? e.message : "No se pudo obtener el remito");
    } finally {
      setRemitoLoading(false);
    }
  }

  useEffect(() => {
    api
      .get<ViajeDetalle>(`/api/viajes/${id}`)
      .then(setViaje)
      .catch((e) => setError(e instanceof Error ? e.message : "Error al cargar el viaje"))
      .finally(() => setLoading(false));
  }, [id]);

  const volver = (
    <button className="btn btn--ghost back-link" onClick={() => router.back()} type="button">
      <ArrowLeft size={14} /> Volver
    </button>
  );

  if (loading) {
    return (
      <div>
        {volver}
        <div className="vd__top">
          <div className="vd__map mapa-ruta--loading" />
          <div className="card skeleton" />
        </div>
      </div>
    );
  }

  if (error || !viaje) {
    return (
      <div>
        {volver}
        <div className="error-banner">{error ?? "Viaje no encontrado."}</div>
      </div>
    );
  }

  const paradas = ordenarParadas(viaje.paradas);
  const origen = paradas[0];
  const destino = paradas.length > 1 ? paradas[paradas.length - 1] : null;
  const intermedias = Math.max(0, paradas.length - 2);
  const entregadas = paradas.filter((p) => p.estado === "ENTREGADO").length;

  const fecha = viaje.fecha_programada ?? viaje.creado_en;
  const precioDiff = viaje.precio_real != null ? viaje.precio_real - viaje.precio_estimado : null;
  const overTime =
    viaje.duracion_real != null && viaje.duracion_estimada != null && viaje.duracion_real > viaje.duracion_estimada;
  const conductorNombre = viaje.conductor ? `${viaje.conductor.usuario.nombre} ${viaje.conductor.usuario.apellido}` : null;

  return (
    <div>
      {volver}

      <div className="vd">
        <div className="vd__top">
          <div className="vd__map">
            <MapaRuta paradas={paradas} ruta={viaje.ruta_planeada} onDistancia={setKmRuta} />
          </div>

          <div className="card vd__summary">
            <div className="vd__tags">
              <span className={`status ${viaje.estado}`}>{ESTADO_LABEL[viaje.estado as keyof typeof ESTADO_LABEL] ?? viaje.estado}</span>
              {esProximo(viaje.estado) && <span className="badge-proximo">Próximo</span>}
              <span className={`zone-tag ${viaje.zona}`}>{viaje.zona}</span>
              <span className="trip-row__id">VJ-{viaje.id_viaje}</span>
            </div>
            <p className="vd__when">{fmtDiaLargo(fecha)} · {fmtHora24(fecha)} h</p>

            <div className="route-stops route-stops--grande">
              {origen && (
                <div className="route-stop">
                  <div className="route-stop__calle">{separarDireccion(origen.direccion).calle}</div>
                  <div className="route-stop__loc">{separarDireccion(origen.direccion).localidad || "Origen"}</div>
                </div>
              )}
              {intermedias > 0 && <div className="route-stops__extra">+ {intermedias} parada{intermedias !== 1 ? "s" : ""} intermedia{intermedias !== 1 ? "s" : ""}</div>}
              {destino && (
                <div className="route-stop route-stop--dest">
                  <div className="route-stop__calle">{separarDireccion(destino.direccion).calle}</div>
                  <div className="route-stop__loc">{separarDireccion(destino.direccion).localidad || "Destino"}</div>
                </div>
              )}
            </div>

            <div className="vd__price-block">
              <p className="vd__price-label">{viaje.precio_real != null ? "Precio final" : "Precio estimado"}</p>
              <p className="vd__price">
                <sup>$</sup>{(viaje.precio_real ?? viaje.precio_estimado).toLocaleString("es-AR")}
              </p>
              <p className="vd__price-hint">
                {viaje.precio_real != null
                  ? precioDiff
                    ? `Estimado ${formatARS(viaje.precio_estimado)} · ${precioDiff > 0 ? "+" : ""}${formatARS(precioDiff)} al cierre`
                    : "Igual al estimado"
                  : "El precio final se fija al cerrar el viaje"}
              </p>
            </div>

            <div className="cluster vd__actions">
              {esEnCurso(viaje.estado) && (
                <Link href={`/viaje-activo?id=${viaje.id_viaje}`} className="btn btn--primary">
                  <Radio size={14} /> Seguir en vivo
                </Link>
              )}
              {esFinalizado(viaje.estado) && (
                <button type="button" className="btn" onClick={abrirRemito} disabled={remitoLoading}>
                  <FileDown size={14} /> {remitoLoading ? "Abriendo remito..." : "Remito PDF"}
                </button>
              )}
            </div>
            {remitoError && <p className="error-text">{remitoError}</p>}
          </div>
        </div>

        <div className="stat-grid">
          <div className="stat">
            <p className="stat__label">Duración estimada</p>
            <p className={`stat__value${viaje.duracion_estimada == null ? " stat__value--muted" : ""}`}>{formatDuracion(viaje.duracion_estimada)}</p>
          </div>
          <div className="stat">
            <p className="stat__label">Duración real</p>
            <p className={`stat__value${viaje.duracion_real == null ? " stat__value--muted" : overTime ? " stat__value--err" : ""}`}>
              {formatDuracion(viaje.duracion_real)}
            </p>
            {viaje.duracion_real == null && <p className="stat__hint">Al cerrar el viaje</p>}
          </div>
          <div className="stat">
            <p className="stat__label">Km del recorrido</p>
            <p className={`stat__value${kmRuta == null ? " stat__value--muted" : ""}`}>{formatKm(kmRuta)}</p>
            <p className="stat__hint">Medidos sobre la ruta del mapa</p>
          </div>
          <div className="stat">
            <p className="stat__label">Km recorridos</p>
            <p className={`stat__value${viaje.km_reales == null ? " stat__value--muted" : ""}`}>{formatKm(viaje.km_reales)}</p>
            {viaje.km_reales == null && <p className="stat__hint">El backend todavía no los informa</p>}
          </div>
          <div className="stat">
            <p className="stat__label">Programado</p>
            <p className="stat__value">{fmtHora24(viaje.fecha_programada)}</p>
            <p className="stat__hint">{fmtDate(viaje.fecha_programada)}</p>
          </div>
          <div className="stat">
            <p className="stat__label">Inicio real</p>
            <p className={`stat__value${!viaje.fecha_inicio ? " stat__value--muted" : ""}`}>{viaje.fecha_inicio ? fmtHora24(viaje.fecha_inicio) : "—"}</p>
            {!viaje.fecha_inicio && <p className="stat__hint">Todavía no arrancó</p>}
          </div>
          <div className="stat">
            <p className="stat__label">Puntualidad</p>
            <p className={`stat__value${!viaje.puntualidad_inicio ? " stat__value--muted" : viaje.puntualidad_inicio === "A_TIEMPO" ? " stat__value--ok" : " stat__value--err"}`}>
              {viaje.puntualidad_inicio ? PUNTUALIDAD_LABEL[viaje.puntualidad_inicio] : "—"}
            </p>
          </div>
          <div className="stat">
            <p className="stat__label">Paradas entregadas</p>
            <p className="stat__value">{entregadas}<span className="muted">/{paradas.length}</span></p>
          </div>
        </div>

        <div className="vd__grid">
          <div className="vd__col">
            <div className="card">
              <p className="card-title">Recorrido y paradas</p>
              <p className="card-sub">{paradas.length} parada{paradas.length !== 1 ? "s" : ""} · se confirman por GPS al llegar</p>
              <div className="timeline">
                {paradas.map((p) => {
                  const done = p.estado === "ENTREGADO";
                  const { calle, localidad } = separarDireccion(p.direccion);
                  return (
                    <div className="tl-item" key={p.orden}>
                      <div className="tl-marker">
                        <span className={`tl-marker__dot${done ? " done" : ""}`} />
                        <span className="tl-marker__line" />
                      </div>
                      <div className="tl-body">
                        <strong>{p.orden}. {calle}</strong>
                        <span>{localidad ? `${localidad} · ` : ""}{done ? "Entregada" : "Pendiente"}</span>
                      </div>
                      <div className="tl-time">{p.fecha_entrega ? `${fmtHora24(p.fecha_entrega)} h` : "—"}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card">
              <p className="card-title">Carga</p>
              <p className="card-sub">Lo que se pidió al crear el viaje</p>
              <div className="kv-grid">
                <div className="kv">
                  <span>Condiciones requeridas</span>
                  {viaje.condiciones_req && viaje.condiciones_req.length > 0 ? (
                    <div className="cred-list">
                      {viaje.condiciones_req.map((c) => <span key={c.condicion} className="cond">{etiquetaCondicion(c.condicion)}</span>)}
                    </div>
                  ) : (
                    <strong>Ninguna</strong>
                  )}
                </div>
                <div className="kv">
                  <span>Indicaciones</span>
                  <strong className={viaje.descripcion ? "kv__texto" : undefined}>{viaje.descripcion || "—"}</strong>
                </div>
              </div>
            </div>

            <div className="card">
              <p className="card-title">Alertas detectadas</p>
              {viaje.alertas === undefined ? (
                <p className="note">El detalle del viaje todavía no trae las alertas: el backend las emite en vivo pero no las guarda en esta respuesta.</p>
              ) : viaje.alertas.length === 0 ? (
                <div className="ok-state">
                  <span className="ok-state__dot" />
                  Sin alertas — viaje sin desvíos ni paradas sospechosas.
                </div>
              ) : (
                viaje.alertas.map((a, i) => (
                  <div className="alert-row" key={i}>
                    <div className="alert-row__icon">⚠</div>
                    <div>
                      <strong>{a.tipo === "DESVIO" ? "Desvío de ruta" : "Parada sospechosa"}</strong>
                      <span>{a.descripcion}</span>
                    </div>
                    <time>{fmtDate(a.creado_en)} · {fmtTime(a.creado_en)}</time>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="vd__col">
            <div className="card">
              <p className="card-title">Conductor</p>
              {viaje.conductor && conductorNombre ? (
                <>
                  <div className="driver-card" style={{ marginBottom: 12 }}>
                    <div className="driver-avatar">{initials(viaje.conductor.usuario.nombre, viaje.conductor.usuario.apellido)}</div>
                    <div className="driver-info">
                      <strong>{conductorNombre}</strong>
                      <span>{viaje.empresa ? viaje.empresa.nombre : "Conductor independiente"}</span>
                      {viaje.conductor.calificacion_promedio != null && (
                        <span className="rating"><Star size={12} fill="currentColor" /> {viaje.conductor.calificacion_promedio.toFixed(1)} / 5</span>
                      )}
                    </div>
                  </div>
                  <ContactoConductor telefono={viaje.conductor.usuario.telefono} />
                </>
              ) : (
                <div className="empty" style={{ padding: 14 }}>Todavía no hay conductor asignado</div>
              )}
            </div>

            <div className="card">
              <p className="card-title">Vehículo</p>
              {viaje.vehiculo ? (
                <div className="kv-grid">
                  <div className="kv"><span>Patente</span><strong className="patente">{viaje.vehiculo.patente}</strong></div>
                  <div className="kv"><span>Tipo</span><strong>{etiquetaTipoVehiculo(viaje.vehiculo.tipo_vehiculo)}</strong></div>
                  <div className="kv"><span>Modelo</span><strong>{viaje.vehiculo.marca} {viaje.vehiculo.modelo}</strong></div>
                  <div className="kv"><span>Año · color</span><strong>{[viaje.vehiculo.anio, viaje.vehiculo.color].filter(Boolean).join(" · ") || "—"}</strong></div>
                </div>
              ) : (
                <div className="empty" style={{ padding: "12px 0", fontSize: 12 }}>Se asigna junto con el conductor</div>
              )}
            </div>

            <div className="card">
              <p className="card-title">Resumen de cobro</p>
              <div className="billing-rows">
                <div className="billing-row">
                  <div>
                    <div className="billing-row__label">Precio estimado</div>
                    <div className="billing-row__sub">Al momento de solicitar</div>
                  </div>
                  <span className="billing-row__amount">{formatARS(viaje.precio_estimado)}</span>
                </div>
                {viaje.precio_real != null && (
                  <div className="billing-row">
                    <div>
                      <div className="billing-row__label">Precio final</div>
                      <div className="billing-row__sub">Al cierre del viaje</div>
                    </div>
                    <span className="billing-row__amount">{formatARS(viaje.precio_real)}</span>
                  </div>
                )}
                {precioDiff != null && precioDiff !== 0 && (
                  <div className="billing-row">
                    <div>
                      <div className="billing-row__label">Diferencia</div>
                      <div className="billing-row__sub">{precioDiff > 0 ? "Ajuste por encima" : "Ajuste a favor"}</div>
                    </div>
                    <span className={`billing-row__amount ${precioDiff > 0 ? "billing-row__amount--up" : "billing-row__amount--down"}`}>
                      {precioDiff > 0 ? "+" : ""}{formatARS(precioDiff)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {viaje.calificacion && (
              <div className="card">
                <p className="card-title">Tu calificación</p>
                <p className="rating" style={{ fontSize: 16 }}><Star size={16} fill="currentColor" /> {viaje.calificacion.puntaje} / 5</p>
                {viaje.calificacion.comentario && <p style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 6 }}>{viaje.calificacion.comentario}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
