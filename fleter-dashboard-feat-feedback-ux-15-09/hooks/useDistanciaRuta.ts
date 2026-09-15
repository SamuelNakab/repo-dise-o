"use client";

import { useEffect, useMemo, useState } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";

interface ParadaDistancia {
  orden: number;
  direccion: string;
  latitud?: number | null;
  longitud?: number | null;
}

export interface DistanciaRuta {
  km: number | null;
  /** Minutos de manejo según Google. Sólo cuando se usó Directions. */
  minutos: number | null;
  cargando: boolean;
}

/**
 * Km (y duración) de un viaje sin dibujar el mapa, para las cards del conductor.
 *
 * Es un **placeholder**: el backend no devuelve la distancia planificada en los
 * GET (pedido I). Si hay `ruta_planeada` se mide esa; si no, se le pide la ruta a
 * Google Directions con las paradas (acepta direcciones de texto, que es lo que
 * trae `mis-viajes-conductor`). Puede no coincidir con la del precio.
 */
export function useDistanciaRuta(
  paradas: ParadaDistancia[],
  ruta: [number, number][] | null | undefined,
  habilitado = true,
): DistanciaRuta {
  const geometryLib = useMapsLibrary("geometry");
  const routesLib = useMapsLibrary("routes");

  const clave = JSON.stringify(paradas.map((p) => [p.orden, p.direccion, p.latitud, p.longitud]));

  const kmDeRuta = useMemo(() => {
    if (!ruta || ruta.length < 2 || !geometryLib) return null;
    const path = ruta.map(([lng, lat]) => new google.maps.LatLng(lat, lng));
    return geometryLib.spherical.computeLength(path) / 1000;
  }, [ruta, geometryLib]);

  const [directions, setDirections] = useState<{ clave: string; km: number | null; minutos: number | null } | null>(null);
  const usaDirections = habilitado && (!ruta || ruta.length < 2) && paradas.length >= 2;

  useEffect(() => {
    if (!usaDirections || !routesLib) return;
    let cancelado = false;
    const ordenadas = [...paradas].sort((a, b) => a.orden - b.orden);
    const punto = (p: ParadaDistancia) =>
      p.latitud != null && p.longitud != null ? { lat: p.latitud, lng: p.longitud } : p.direccion;

    new routesLib.DirectionsService()
      .route({
        origin: punto(ordenadas[0]),
        destination: punto(ordenadas[ordenadas.length - 1]),
        waypoints: ordenadas.slice(1, -1).map((p) => ({ location: punto(p), stopover: true })),
        travelMode: google.maps.TravelMode.DRIVING,
      })
      .then((res) => {
        if (cancelado) return;
        const legs = res.routes[0]?.legs ?? [];
        const metros = legs.reduce((a, l) => a + (l.distance?.value ?? 0), 0);
        const segundos = legs.reduce((a, l) => a + (l.duration?.value ?? 0), 0);
        setDirections({ clave, km: legs.length ? metros / 1000 : null, minutos: legs.length ? Math.round(segundos / 60) : null });
      })
      .catch(() => {
        if (!cancelado) setDirections({ clave, km: null, minutos: null });
      });

    return () => { cancelado = true; };
    // `clave` resume las paradas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usaDirections, routesLib, clave]);

  if (!habilitado) return { km: null, minutos: null, cargando: false };
  if (!usaDirections) return { km: kmDeRuta, minutos: null, cargando: !!ruta && ruta.length >= 2 && !geometryLib };
  const vigente = directions?.clave === clave ? directions : null;
  return { km: vigente?.km ?? null, minutos: vigente?.minutos ?? null, cargando: !vigente };
}
