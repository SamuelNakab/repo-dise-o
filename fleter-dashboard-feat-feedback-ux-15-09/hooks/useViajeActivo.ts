"use client";

import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { api } from "@/lib/api";
import { getAuthToken } from "@/lib/firebase";
import { BASE_URL, MOCK } from "@/lib/config";

/** Umbrales (30 / 120 min por default) los define el backend al iniciar el viaje. */
export type Puntualidad = "A_TIEMPO" | "TARDE" | "MUY_TARDE";

export interface Parada {
  orden: number;
  direccion: string;
  latitud?: number;
  longitud?: number;
  estado: "PENDIENTE" | "ENTREGADO";
  fecha_entrega: string | null;
}

export interface ViajeDetalle {
  id_viaje: number;
  zona: string;
  precio_estimado: number;
  precio_real: number | null;
  descripcion: string | null;
  estado: string;
  fecha_programada: string;
  /** Momento real en que se pulsó "Iniciar viaje". `null` hasta que arranca. */
  fecha_inicio: string | null;
  /** Calculada al iniciar contra `fecha_programada`. `null` hasta que arranca. */
  puntualidad_inicio: Puntualidad | null;
  creado_en: string;
  paradas: Parada[];
  condiciones_req: { condicion: string }[];
  conductor: {
    id_conductor: number;
    calificacion_promedio: number;
    usuario: { nombre: string; apellido: string; telefono: string };
  } | null;
  vehiculo: {
    patente: string;
    marca: string;
    modelo: string;
    tipo_vehiculo: string;
    color: string;
  } | null;
  ruta_planeada: [number, number][] | null;
}

/**
 * Cómo se factura, según el contrato:
 * - `tiempo_horas` / `distancia_km` son los **totales medidos** por GPS.
 * - `tiempo_capital` / `distancia_provincia` son la parte de esos totales que
 *   **efectivamente se cobra** (`null` = no se cobra por ese concepto).
 * En `MIXTO` van prorrateados por `fraccion_caba`; mostrar los totales como si
 * fueran lo facturado infla el número.
 */
export interface DesgloseCosto {
  precio_por_tiempo: number | null;
  precio_por_distancia: number | null;
  tiempo_horas: number;
  distancia_km: number;
  tiempo_capital?: number | null;
  distancia_provincia?: number | null;
  /** Proporción de paradas dentro de CABA: `1` en CABA, `0` en PROVINCIA. */
  fraccion_caba?: number;
  tarifa_hora: number | null;
  tarifa_km: number | null;
  es_hora_pico: boolean;
}

export interface CostoAcumulado {
  precio_acumulado: number;
  desglose: DesgloseCosto | null;
}

export interface UbicacionUpdate {
  lat: number;
  lng: number;
  timestamp: number;
  velocidad_kmh: number;
}

export interface EtaUpdate {
  id_viaje: number;
  proxima_parada_id: number;
  segundos_restantes: number;
  minutos_restantes: number;
}

export interface AlertaItem {
  id: string;
  tipo: "desvio" | "parada";
  mensaje: string;
  timestamp: number;
}

/** Payload del evento `viaje:iniciado` (room personal del cliente). */
export interface ViajeIniciadoPayload {
  id_viaje: number;
  fecha_inicio: string;
  puntualidad_inicio: Puntualidad;
}

export interface ViajeFinalizadoPayload {
  id_viaje: number;
  precio_real: number;
  /**
   * El contrato dice que las magnitudes facturadas también viajan acá, pero el
   * ejemplo del evento no las muestra: por eso son opcionales.
   */
  desglose: Omit<DesgloseCosto, "es_hora_pico">;
  remito_url: string;
}

export function useViajeActivo(id_viaje: number) {
  const [viaje, setViaje] = useState<ViajeDetalle | null>(null);
  const [costo, setCosto] = useState<CostoAcumulado | null>(null);
  const [estado, setEstado] = useState<string | null>(null);
  // En MOCK la posición inicial (Once) se deriva en el initializer; en modo
  // real arranca en null hasta que el socket envíe la primera ubicación.
  const [ultimaPos, setUltimaPos] = useState<UbicacionUpdate | null>(() =>
    MOCK ? { lat: -34.6087, lng: -58.4088, timestamp: Date.now(), velocidad_kmh: 45 } : null
  );
  const [ruta, setRuta] = useState<[number, number][] | null>(null);
  // En MOCK el ETA inicial (~31 min) se deriva en el initializer; en modo real
  // arranca en null hasta que el socket envíe el primer eta:actualizar.
  const [eta, setEta] = useState<EtaUpdate | null>(() =>
    MOCK
      ? { id_viaje, proxima_parada_id: 2, segundos_restantes: 31 * 60, minutos_restantes: 31 }
      : null
  );
  const [alertas, setAlertas] = useState<AlertaItem[]>([]);
  const [finalizado, setFinalizado] = useState<ViajeFinalizadoPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initial REST data (loading arranca en true desde el useState inicial)
  useEffect(() => {
    Promise.all([
      api.get<ViajeDetalle>(`/api/viajes/${id_viaje}`),
      api.get<CostoAcumulado>(`/api/viajes/${id_viaje}/costo-acumulado`),
    ])
      .then(([v, c]) => {
        setViaje(v);
        setEstado(v.estado);
        setRuta(v.ruta_planeada);
        setCosto(c);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Error al cargar el viaje")
      )
      .finally(() => setLoading(false));
  }, [id_viaje]);

  // Socket
  useEffect(() => {
    if (MOCK) {
      // Simulate incremental cost updates
      let acc = 2100;
      const costInterval = setInterval(() => {
        acc += 60;
        setCosto((prev) =>
          prev
            ? {
                ...prev,
                precio_acumulado: acc,
                desglose: prev.desglose
                  ? { ...prev.desglose, distancia_km: prev.desglose.distancia_km + 0.6 }
                  : null,
              }
            : null
        );
      }, 5000);

      // Simulate conductor GPS movement: Once → Quilmes
      const p1 = { lat: -34.6087, lng: -58.4088 };
      const p2 = { lat: -34.7206, lng: -58.2535 };
      let step = 0;
      const steps = 30;
      // La posición inicial (p1) ya quedó seteada en el useState inicial.
      const gpsInterval = setInterval(() => {
        step = Math.min(step + 1, steps);
        const t = step / steps;
        setUltimaPos({
          lat: p1.lat + (p2.lat - p1.lat) * t,
          lng: p1.lng + (p2.lng - p1.lng) * t,
          timestamp: Date.now(),
          velocidad_kmh: 45,
        });
      }, 3000);

      // Simulate ETA countdown to next stop (~31 min → decreasing).
      // El valor inicial ya quedó seteado en el useState inicial.
      let segundos = 31 * 60;
      const etaInterval = setInterval(() => {
        segundos = Math.max(0, segundos - 30);
        setEta({
          id_viaje,
          proxima_parada_id: 2,
          segundos_restantes: segundos,
          minutos_restantes: Math.ceil(segundos / 60),
        });
      }, 5000);

      // Simulate a single route recalculation due to a detour
      const recalcTimeout = setTimeout(() => {
        setRuta([
          [-58.4088, -34.6087],
          [-58.3902, -34.6201],
          [-58.3502, -34.6402],
          [-58.3001, -34.6789],
          [-58.2535, -34.7206],
        ]);
        setAlertas((prev) => [
          {
            id: `recalculo-${Date.now()}`,
            tipo: "desvio",
            mensaje: "Ruta recalculada por desvío",
            timestamp: Date.now(),
          },
          ...prev,
        ]);
      }, 12000);

      return () => {
        clearInterval(costInterval);
        clearInterval(gpsInterval);
        clearInterval(etaInterval);
        clearTimeout(recalcTimeout);
      };
    }

    let socket: Socket;
    let cancelled = false;

    async function connect() {
      try {
        const token = await getAuthToken();
        if (cancelled) return;

        socket = io(BASE_URL, {
          auth: { token: token ? `Bearer ${token}` : "" },
          transports: ["websocket", "polling"],
        });

        socket.on("connect", () => {
          socket.emit("join:viaje", { id_viaje });
        });

        socket.on("mapa:actualizar", (data: UbicacionUpdate) => {
          setUltimaPos(data);
        });

        socket.on("costo:actualizar", (data: CostoAcumulado) => {
          setCosto(data);
        });

        socket.on("eta:actualizar", (data: EtaUpdate) => {
          setEta(data);
        });

        socket.on(
          "ruta:recalculada",
          (data: { id_viaje: number; nueva_ruta: [number, number][]; proxima_parada_id: number; motivo: string }) => {
            setRuta(data.nueva_ruta);
            setAlertas((prev) => [
              {
                id: `recalculo-${Date.now()}`,
                tipo: "desvio",
                mensaje: "Ruta recalculada por desvío",
                timestamp: Date.now(),
              },
              ...prev,
            ]);
          }
        );

        socket.on(
          "alerta:desvio",
          (data: { id_viaje: number; distancia_metros: number; mensaje: string }) => {
            setAlertas((prev) => [
              { id: `desvio-${Date.now()}`, tipo: "desvio", mensaje: data.mensaje, timestamp: Date.now() },
              ...prev,
            ]);
          }
        );

        socket.on(
          "alerta:parada",
          (data: { id_viaje: number; minutos_detenido: number; mensaje: string }) => {
            setAlertas((prev) => [
              { id: `parada-${Date.now()}`, tipo: "parada", mensaje: data.mensaje, timestamp: Date.now() },
              ...prev,
            ]);
          }
        );

        /**
         * `CONDUCTOR_ASIGNADO → EN_CAMINO_A_ORIGEN` NO pasa por
         * `viaje:estado_cambiado`: lo dispara el botón "Iniciar viaje" y el
         * servidor avisa con este evento. Sin escucharlo, la pantalla se queda
         * en "conductor asignado" con el flete ya en camino.
         *
         * Ojo: llega al room **personal** del cliente (`usuario:{id}`), no al
         * room del viaje — no depende del `join:viaje` de arriba.
         */
        socket.on("viaje:iniciado", (data: ViajeIniciadoPayload) => {
          setEstado("EN_CAMINO_A_ORIGEN");
          setViaje((prev) =>
            prev
              ? {
                  ...prev,
                  estado: "EN_CAMINO_A_ORIGEN",
                  fecha_inicio: data.fecha_inicio,
                  puntualidad_inicio: data.puntualidad_inicio,
                }
              : prev
          );
        });

        socket.on(
          "viaje:estado_cambiado",
          (data: { estado_anterior: string; estado_nuevo: string }) => {
            setEstado(data.estado_nuevo);
          }
        );

        socket.on("viaje:finalizado", (data: ViajeFinalizadoPayload) => {
          setFinalizado(data);
          setEstado("FINALIZADO");
        });
      } catch {
        // socket failure is non-fatal — REST data still displays
      }
    }

    connect();

    return () => {
      cancelled = true;
      if (socket) {
        socket.emit("leave:viaje", { id_viaje });
        socket.disconnect();
      }
    };
  }, [id_viaje]);

  return { viaje, costo, estado, ultimaPos, ruta, eta, alertas, finalizado, loading, error };
}
