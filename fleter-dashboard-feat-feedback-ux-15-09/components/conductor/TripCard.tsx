"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Route, Clock, MapPin, User, ChevronDown, ChevronUp } from "lucide-react";
import { ESTADO_LABEL } from "@/lib/estados";
import { separarDireccion, ordenarParadas, formatKm, fmtHora24 } from "@/lib/viajes";
import { etiquetaCondicion } from "@/lib/vehiculos";
import { formatDuracion } from "@/lib/utils";
import { useDistanciaRuta } from "@/hooks/useDistanciaRuta";
import MapaRuta from "@/components/MapaRuta";

/**
 * Rótulo obligatorio del monto que ve el conductor. Es la tarifa del viaje, no
 * lo que cobra: el backend no manda el neto (pedido I) y no calculamos el fee
 * en el front. Decisión del 15-09: nunca decir "ganás".
 */
export const TARIFA_NOTA = "Tarifa del viaje · antes de la comisión de Fleter";

export interface TripCardViaje {
  id_viaje: number;
  zona?: "CABA" | "PROVINCIA" | "MIXTO";
  precio_estimado: number;
  precio_real?: number | null;
  fecha_programada: string;
  estado?: string;
  descripcion?: string | null;
  paradas: { orden: number; direccion: string; latitud?: number | null; longitud?: number | null }[];
  condiciones_req?: { condicion: string }[];
  cliente?: { usuario: { nombre: string; apellido: string; telefono?: string | null } } | null;
}

export default function TripCard({
  viaje,
  href,
  ruta,
  duracionEstimada,
  calcularKm = true,
  mostrarEstado = false,
  mapaAbierto,
  onToggleMapa,
  acciones,
}: {
  viaje: TripCardViaje;
  href?: string;
  ruta?: [number, number][] | null;
  /** Minutos del backend (`duracion_estimada`). Si falta, se usa la de Directions. */
  duracionEstimada?: number | null;
  calcularKm?: boolean;
  mostrarEstado?: boolean;
  mapaAbierto?: boolean;
  onToggleMapa?: () => void;
  acciones?: ReactNode;
}) {
  const router = useRouter();
  const paradas = ordenarParadas(viaje.paradas);
  const origen = paradas[0];
  const destino = paradas.length > 1 ? paradas[paradas.length - 1] : null;
  const intermedias = Math.max(0, paradas.length - 2);
  const { km, minutos, cargando } = useDistanciaRuta(paradas, ruta, calcularKm);
  const duracion = duracionEstimada ?? minutos;

  const f = new Date(viaje.fecha_programada);
  const precio = viaje.precio_real ?? viaje.precio_estimado;

  function abrir() {
    if (href) router.push(href);
  }

  return (
    <article
      className={`trip-card${href ? " trip-card--link" : ""}`}
      onClick={href ? abrir : undefined}
      onKeyDown={href ? (e) => { if (e.key === "Enter") abrir(); } : undefined}
      role={href ? "link" : undefined}
      tabIndex={href ? 0 : undefined}
    >
      <div className="trip-card__when" title={f.toLocaleString("es-AR")}>
        <span className="trip-card__dow">{f.toLocaleDateString("es-AR", { weekday: "short" }).replace(".", "")}</span>
        <span className="trip-card__day">{f.getDate()}</span>
        <span className="trip-card__month">{f.toLocaleDateString("es-AR", { month: "short" }).replace(".", "")}</span>
        <span className="trip-card__hour">{fmtHora24(viaje.fecha_programada)}</span>
      </div>

      <div className="trip-card__body">
        <div className="trip-card__tags">
          <span className="trip-row__id">VJ-{viaje.id_viaje}</span>
          {mostrarEstado && viaje.estado && (
            <span className={`status ${viaje.estado}`}>{ESTADO_LABEL[viaje.estado as keyof typeof ESTADO_LABEL] ?? viaje.estado}</span>
          )}
          {viaje.zona && <span className={`zone-tag ${viaje.zona}`}>{viaje.zona}</span>}
          {viaje.condiciones_req?.map((c) => (
            <span key={c.condicion} className="cond">{etiquetaCondicion(c.condicion)}</span>
          ))}
        </div>

        <div className="route-stops">
          {origen && (
            <div className="route-stop">
              <div className="route-stop__calle">{separarDireccion(origen.direccion).calle}</div>
              <div className="route-stop__loc">{separarDireccion(origen.direccion).localidad || "Origen"}</div>
            </div>
          )}
          {intermedias > 0 && <div className="route-stops__extra">+ {intermedias} parada{intermedias !== 1 ? "s" : ""} en el medio</div>}
          {destino && (
            <div className="route-stop route-stop--dest">
              <div className="route-stop__calle">{separarDireccion(destino.direccion).calle}</div>
              <div className="route-stop__loc">{separarDireccion(destino.direccion).localidad || "Destino"}</div>
            </div>
          )}
        </div>

        <div className="trip-card__stats">
          {calcularKm && (
            <span title="Medido sobre la ruta; el backend todavía no manda la distancia planificada">
              <Route size={14} /> {cargando ? "…" : formatKm(km)}
            </span>
          )}
          <span><Clock size={14} /> {duracion != null ? formatDuracion(duracion) : "—"}</span>
          <span><MapPin size={14} /> {paradas.length} parada{paradas.length !== 1 ? "s" : ""}</span>
          {viaje.cliente && (
            <span><User size={14} /> {viaje.cliente.usuario.nombre} {viaje.cliente.usuario.apellido}</span>
          )}
        </div>
        {viaje.descripcion && <p className="note">{viaje.descripcion}</p>}
      </div>

      <div className="trip-card__side" onClick={(e) => e.stopPropagation()}>
        <div>
          <p className="trip-card__price">{"$" + precio.toLocaleString("es-AR")}</p>
          <p className="trip-card__price-note">{viaje.precio_real != null ? "Precio final · antes de la comisión de Fleter" : TARIFA_NOTA}</p>
        </div>
        <div className="cluster cluster--end">
          {onToggleMapa && (
            <button type="button" className="btn" onClick={onToggleMapa}>
              {mapaAbierto ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Recorrido
            </button>
          )}
          {acciones}
        </div>
      </div>

      {mapaAbierto && (
        <div className="trip-card__map" onClick={(e) => e.stopPropagation()}>
          <MapaRuta paradas={paradas} ruta={ruta} />
        </div>
      )}
    </article>
  );
}
