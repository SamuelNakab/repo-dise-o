"use client";

import dynamic from "next/dynamic";

/**
 * Mapa con la ruta de un viaje, para cualquier estado (antes solo existía en
 * viaje activo). Se carga sin SSR: Google Maps necesita `window`.
 * Usa el `APIProvider` global de `components/GoogleMapsProvider.tsx`.
 */
const MapaRuta = dynamic(() => import("./MapaRutaCanvas"), {
  ssr: false,
  loading: () => <div className="mapa-ruta mapa-ruta--loading" />,
});

export default MapaRuta;
export type { ParadaMapa, PosicionMapa, FuenteRuta } from "./MapaRutaCanvas";
