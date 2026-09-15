"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Map, AdvancedMarker, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";

export interface ParadaMapa {
  orden: number;
  direccion: string;
  latitud?: number | null;
  longitud?: number | null;
  estado?: string;
}

export interface PosicionMapa {
  lat: number;
  lng: number;
}

/** De dónde salió la línea dibujada. Se muestra para no hacer pasar una recta por un recorrido. */
export type FuenteRuta = "backend" | "directions" | "recta" | "sin-datos";

type LatLng = google.maps.LatLngLiteral;

interface Props {
  paradas: ParadaMapa[];
  /** Ruta del backend, `[lng, lat]` (ver "Formato de ruta" en el contrato). */
  ruta?: [number, number][] | null;
  ultimaPos?: PosicionMapa | null;
  seguirConductor?: boolean;
  /** Km del recorrido dibujado. `null` si solo hay línea recta (no es un recorrido real). */
  onDistancia?: (km: number | null) => void;
}

function tieneCoords(p: ParadaMapa): p is ParadaMapa & { latitud: number; longitud: number } {
  return p.latitud != null && p.longitud != null;
}

/**
 * Traza la ruta y la mide. Orden de preferencia:
 * 1. `ruta_planeada` del backend (es la que se usó para el precio).
 * 2. Google Directions con las paradas como waypoints. Hace falta porque el
 *    backend la devuelve `null` en viajes terminados y cuando Google falló al
 *    crear el viaje — antes el mapa caía directo a unir los puntos.
 * 3. Línea recta, marcada como aproximada y sin km.
 */
function RutaLayer({ paradas, ruta, onDistancia, onFuente, onPins }: {
  paradas: ParadaMapa[];
  ruta?: [number, number][] | null;
  onDistancia?: (km: number | null) => void;
  onFuente: (f: FuenteRuta) => void;
  onPins: (pins: { orden: number; pos: LatLng }[]) => void;
}) {
  const map = useMap();
  const mapsLib = useMapsLibrary("maps");
  const routesLib = useMapsLibrary("routes");
  const geometryLib = useMapsLibrary("geometry");
  const polyRef = useRef<google.maps.Polyline | null>(null);

  // Clave estable para no rehacer Directions en cada render del padre.
  const clave = useMemo(
    () => JSON.stringify({ p: paradas.map((p) => [p.orden, p.direccion, p.latitud, p.longitud]), r: ruta?.length ?? 0 }),
    [paradas, ruta],
  );

  useEffect(() => {
    if (!map || !mapsLib || !geometryLib) return;
    let cancelado = false;
    const ordenadas = [...paradas].sort((a, b) => a.orden - b.orden);

    function dibujar(path: LatLng[], fuente: FuenteRuta, km: number | null) {
      if (cancelado) return;
      polyRef.current?.setMap(null);
      polyRef.current = new mapsLib!.Polyline({
        path,
        strokeColor: "#E85D2A",
        strokeWeight: fuente === "recta" ? 2 : 4,
        strokeOpacity: fuente === "recta" ? 0.6 : 0.9,
        icons: fuente === "recta"
          ? [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 }, offset: "0", repeat: "14px" }]
          : undefined,
        map,
      });
      const bounds = new google.maps.LatLngBounds();
      path.forEach((pt) => bounds.extend(pt));
      map!.fitBounds(bounds, 48);
      onFuente(fuente);
      onDistancia?.(km);
    }

    function recta() {
      const path = ordenadas.filter(tieneCoords).map((p) => ({ lat: p.latitud, lng: p.longitud }));
      if (path.length >= 2) dibujar(path, "recta", null);
      else if (!cancelado) { onFuente("sin-datos"); onDistancia?.(null); }
    }

    onPins(ordenadas.filter(tieneCoords).map((p) => ({ orden: p.orden, pos: { lat: p.latitud, lng: p.longitud } })));

    if (ruta && ruta.length >= 2) {
      const path = ruta.map(([lng, lat]) => ({ lat, lng }));
      const metros = geometryLib.spherical.computeLength(path.map((p) => new google.maps.LatLng(p)));
      dibujar(path, "backend", metros / 1000);
    } else if (routesLib && ordenadas.length >= 2) {
      // Directions acepta coordenadas o direcciones de texto: `mis-viajes-conductor`
      // no manda lat/lng, así que se cae a la dirección.
      const punto = (p: ParadaMapa): string | LatLng => (tieneCoords(p) ? { lat: p.latitud, lng: p.longitud } : p.direccion);
      new routesLib.DirectionsService()
        .route({
          origin: punto(ordenadas[0]),
          destination: punto(ordenadas[ordenadas.length - 1]),
          waypoints: ordenadas.slice(1, -1).map((p) => ({ location: punto(p), stopover: true })),
          travelMode: google.maps.TravelMode.DRIVING,
        })
        .then((res) => {
          const r = res.routes[0];
          if (!r) return recta();
          const metros = r.legs.reduce((acc, leg) => acc + (leg.distance?.value ?? 0), 0);
          // Si las paradas no traían coordenadas, los pines salen de los tramos.
          if (!ordenadas.some(tieneCoords)) {
            const pins = r.legs.map((leg, i) => ({ orden: ordenadas[i].orden, pos: leg.start_location.toJSON() }));
            const ultimo = r.legs[r.legs.length - 1];
            if (ultimo) pins.push({ orden: ordenadas[ordenadas.length - 1].orden, pos: ultimo.end_location.toJSON() });
            if (!cancelado) onPins(pins);
          }
          dibujar(r.overview_path.map((ll) => ll.toJSON()), "directions", metros / 1000);
        })
        .catch((err) => {
          // REQUEST_DENIED = la key no tiene habilitada Directions API. Se deja
          // en consola a propósito: esconderlo es lo que hizo que "el mapa une
          // puntos" pareciera un bug de dibujo.
          console.warn("[MapaRuta] Directions falló, se muestra línea recta:", err);
          recta();
        });
    } else if (ordenadas.length >= 2) {
      recta();
    } else {
      onFuente("sin-datos");
    }

    return () => {
      cancelado = true;
      polyRef.current?.setMap(null);
      polyRef.current = null;
    };
    // `clave` resume paradas y ruta; los callbacks del padre no deben redisparar Directions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, mapsLib, routesLib, geometryLib, clave]);

  return null;
}

function SeguirConductor({ pos }: { pos: PosicionMapa | null | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (pos && map) map.panTo(pos);
  }, [pos, map]);
  return null;
}

export default function MapaRutaCanvas({ paradas, ruta, ultimaPos, seguirConductor = false, onDistancia }: Props) {
  const [fuente, setFuente] = useState<FuenteRuta | null>(null);
  const [pins, setPins] = useState<{ orden: number; pos: LatLng }[]>([]);

  const estadoPorOrden = useMemo(() => new globalThis.Map(paradas.map((p) => [p.orden, p.estado])), [paradas]);
  const ultimoOrden = paradas.reduce((m, p) => Math.max(m, p.orden), 0);
  const primera = paradas.find(tieneCoords);
  const centro = ultimaPos ?? (primera ? { lat: primera.latitud!, lng: primera.longitud! } : { lat: -34.6037, lng: -58.3816 });

  return (
    <div className="mapa-ruta">
      <Map
        defaultCenter={centro}
        defaultZoom={12}
        mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID"}
        disableDefaultUI
        zoomControl
        gestureHandling="cooperative"
        style={{ width: "100%", height: "100%" }}
      >
        <RutaLayer paradas={paradas} ruta={ruta} onDistancia={onDistancia} onFuente={setFuente} onPins={setPins} />
        {pins.map(({ orden, pos }) => {
          const done = estadoPorOrden.get(orden) === "ENTREGADO";
          const esFin = orden === ultimoOrden;
          return (
            <AdvancedMarker key={`${orden}-${pos.lat}`} position={pos}>
              <div className={`mapa-pin mapa-pin--${done ? "done" : esFin ? "fin" : "pending"}`}>
                {done ? "✓" : orden}
              </div>
            </AdvancedMarker>
          );
        })}
        {ultimaPos && (
          <AdvancedMarker position={ultimaPos}>
            <div className="mapa-pin mapa-pin--conductor" />
          </AdvancedMarker>
        )}
        {seguirConductor && <SeguirConductor pos={ultimaPos} />}
      </Map>
      {fuente === "recta" && (
        <span className="mapa-ruta__aviso">Recorrido aproximado: no se pudo calcular la ruta por calles</span>
      )}
      {fuente === "sin-datos" && (
        <span className="mapa-ruta__aviso">Este viaje no tiene ubicaciones para dibujar</span>
      )}
    </div>
  );
}
