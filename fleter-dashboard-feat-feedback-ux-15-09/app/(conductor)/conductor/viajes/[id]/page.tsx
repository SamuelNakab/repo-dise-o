"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Mail } from "lucide-react";
import { api } from "@/lib/api";
import { ESTADO_LABEL, esProximo } from "@/lib/estados";
import { ordenarParadas, separarDireccion, formatKm, fmtDiaLargo, fmtHora24, PUNTUALIDAD_LABEL } from "@/lib/viajes";
import { etiquetaTipoVehiculo, etiquetaCondicion } from "@/lib/vehiculos";
import { formatARS, formatDuracion } from "@/lib/utils";
import MapaRuta from "@/components/MapaRuta";
import ContactoConductor from "@/components/ContactoConductor";
import { TARIFA_NOTA } from "@/components/conductor/TripCard";

/** `VENTANA_INICIO_MINUTOS` del backend. El default del contrato es 30; si lo cambian, este texto miente. */
const VENTANA_INICIO_MIN = 30;

/** `GET /api/viajes/:id` visto por el conductor asignado (contrato). */
interface ViajeConductor {
  id_viaje: number;
  zona: "CABA" | "PROVINCIA" | "MIXTO";
  precio_estimado: number;
  precio_real: number | null;
  descripcion: string | null;
  estado: string;
  fecha_programada: string;
  fecha_inicio: string | null;
  puntualidad_inicio: "A_TIEMPO" | "TARDE" | "MUY_TARDE" | null;
  duracion_estimada: number | null;
  paradas: { orden: number; direccion: string; latitud?: number | null; longitud?: number | null; estado?: string; fecha_entrega?: string | null }[];
  condiciones_req: { condicion: string }[];
  cliente: { usuario: { nombre: string; apellido: string; email?: string; telefono?: string | null } } | null;
  vehiculo: { patente: string; marca: string; modelo: string; tipo_vehiculo: string; anio?: number; color?: string } | null;
  empresa: { nombre: string } | null;
  ruta_planeada: [number, number][] | null;
}

export default function ViajeConductorPage() {
  const { id } = useParams<{ id: string }>();
  const [viaje, setViaje] = useState<ViajeConductor | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [km, setKm] = useState<number | null>(null);

  useEffect(() => {
    api.get<ViajeConductor>(`/api/viajes/${id}`)
      .then(setViaje)
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudo cargar el viaje"));
  }, [id]);

  const volver = (
    <Link href="/conductor/mis-viajes" className="btn btn--ghost back-link">
      <ArrowLeft size={14} /> Mis viajes
    </Link>
  );

  if (error) return <div>{volver}<div className="error-banner">{error}</div></div>;
  if (!viaje) {
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

  const paradas = ordenarParadas(viaje.paradas);
  const origen = paradas[0];
  const destino = paradas.length > 1 ? paradas[paradas.length - 1] : null;
  const entregadas = paradas.filter((p) => p.estado === "ENTREGADO").length;
  const aperturaInicio = new Date(new Date(viaje.fecha_programada).getTime() - VENTANA_INICIO_MIN * 60_000).toISOString();

  return (
    <div>
      {volver}
      <div className="vd">
        <div className="vd__top">
          <div className="vd__map">
            <MapaRuta paradas={paradas} ruta={viaje.ruta_planeada} onDistancia={setKm} />
          </div>

          <div className="card vd__summary">
            <div className="vd__tags">
              <span className={`status ${viaje.estado}`}>{ESTADO_LABEL[viaje.estado as keyof typeof ESTADO_LABEL] ?? viaje.estado}</span>
              <span className={`zone-tag ${viaje.zona}`}>{viaje.zona}</span>
              <span className="trip-row__id">VJ-{viaje.id_viaje}</span>
            </div>
            <p className="vd__when">{fmtDiaLargo(viaje.fecha_programada)} · {fmtHora24(viaje.fecha_programada)} h</p>

            <div className="route-stops route-stops--grande">
              {origen && (
                <div className="route-stop">
                  <div className="route-stop__calle">{separarDireccion(origen.direccion).calle}</div>
                  <div className="route-stop__loc">{separarDireccion(origen.direccion).localidad || "Retiro"}</div>
                </div>
              )}
              {paradas.length > 2 && <div className="route-stops__extra">+ {paradas.length - 2} parada{paradas.length - 2 !== 1 ? "s" : ""} en el medio</div>}
              {destino && (
                <div className="route-stop route-stop--dest">
                  <div className="route-stop__calle">{separarDireccion(destino.direccion).calle}</div>
                  <div className="route-stop__loc">{separarDireccion(destino.direccion).localidad || "Entrega"}</div>
                </div>
              )}
            </div>

            <div className="vd__price-block">
              <p className="vd__price-label">{viaje.precio_real != null ? "Precio final" : "Tarifa del viaje"}</p>
              <p className="vd__price"><sup>$</sup>{(viaje.precio_real ?? viaje.precio_estimado).toLocaleString("es-AR")}</p>
              <p className="vd__price-hint">{viaje.precio_real != null ? "Antes de la comisión de Fleter" : TARIFA_NOTA}</p>
            </div>

            {esProximo(viaje.estado) && (
              <p className="note">
                Lo iniciás desde la app a partir de las <strong>{fmtHora24(aperturaInicio)} h</strong> ({VENTANA_INICIO_MIN} min antes
                del horario). El GPS arranca recién después de iniciar.
              </p>
            )}
          </div>
        </div>

        <div className="stat-grid">
          <div className="stat">
            <p className="stat__label">Distancia</p>
            <p className={`stat__value${km == null ? " stat__value--muted" : ""}`}>{formatKm(km)}</p>
            <p className="stat__hint">Medida sobre la ruta del mapa</p>
          </div>
          <div className="stat">
            <p className="stat__label">Duración estimada</p>
            <p className={`stat__value${viaje.duracion_estimada == null ? " stat__value--muted" : ""}`}>{formatDuracion(viaje.duracion_estimada)}</p>
          </div>
          <div className="stat">
            <p className="stat__label">Paradas</p>
            <p className="stat__value">{entregadas}<span className="muted">/{paradas.length}</span></p>
            <p className="stat__hint">entregadas</p>
          </div>
          <div className="stat">
            <p className="stat__label">{viaje.fecha_inicio ? "Inicio real" : "Horario"}</p>
            <p className="stat__value">{fmtHora24(viaje.fecha_inicio ?? viaje.fecha_programada)}</p>
            <p className="stat__hint">
              {viaje.puntualidad_inicio ? PUNTUALIDAD_LABEL[viaje.puntualidad_inicio] : "programado"}
            </p>
          </div>
        </div>

        <div className="vd__grid">
          <div className="vd__col">
            <div className="card">
              <p className="card-title">Paradas en orden</p>
              <p className="card-sub">Cada parada se confirma con el GPS al llegar</p>
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
              <div className="kv-grid">
                <div className="kv">
                  <span>Condiciones</span>
                  {viaje.condiciones_req.length > 0 ? (
                    <div className="cred-list">
                      {viaje.condiciones_req.map((c) => <span key={c.condicion} className="cond">{etiquetaCondicion(c.condicion)}</span>)}
                    </div>
                  ) : <strong>Ninguna especial</strong>}
                </div>
                <div className="kv">
                  <span>Indicaciones del cliente</span>
                  <strong className="kv__texto">{viaje.descripcion || "—"}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="vd__col">
            <div className="card">
              <p className="card-title">Cliente</p>
              {viaje.cliente ? (
                <>
                  <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>
                    {viaje.cliente.usuario.nombre} {viaje.cliente.usuario.apellido}
                  </p>
                  {viaje.cliente.usuario.telefono ? (
                    <ContactoConductor telefono={viaje.cliente.usuario.telefono} />
                  ) : viaje.cliente.usuario.email ? (
                    <a href={`mailto:${viaje.cliente.usuario.email}`} className="contacto__btn" style={{ width: "fit-content" }}>
                      <Mail size={14} /> {viaje.cliente.usuario.email}
                    </a>
                  ) : (
                    <p className="contacto__vacio">Sin datos de contacto</p>
                  )}
                </>
              ) : <p className="contacto__vacio">—</p>}
            </div>

            <div className="card">
              <p className="card-title">Vehículo asignado</p>
              {viaje.vehiculo ? (
                <div className="kv-grid">
                  <div className="kv"><span>Patente</span><strong className="patente">{viaje.vehiculo.patente}</strong></div>
                  <div className="kv"><span>Tipo</span><strong>{etiquetaTipoVehiculo(viaje.vehiculo.tipo_vehiculo)}</strong></div>
                  <div className="kv"><span>Modelo</span><strong>{viaje.vehiculo.marca} {viaje.vehiculo.modelo}</strong></div>
                  <div className="kv"><span>Empresa</span><strong>{viaje.empresa?.nombre ?? "Independiente"}</strong></div>
                </div>
              ) : <p className="contacto__vacio">Sin vehículo asignado</p>}
            </div>

            {viaje.precio_real != null && viaje.precio_real !== viaje.precio_estimado && (
              <div className="card">
                <p className="card-title">Ajuste al cierre</p>
                <div className="billing-rows">
                  <div className="billing-row"><span className="billing-row__label">Estimado</span><span className="billing-row__amount">{formatARS(viaje.precio_estimado)}</span></div>
                  <div className="billing-row"><span className="billing-row__label">Final</span><span className="billing-row__amount">{formatARS(viaje.precio_real)}</span></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
