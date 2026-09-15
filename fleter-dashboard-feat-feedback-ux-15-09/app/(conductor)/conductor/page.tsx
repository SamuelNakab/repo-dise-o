"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Truck, SearchX } from "lucide-react";
import { api } from "@/lib/api";
import { useSocket } from "@/hooks/useSocket";
import { useAuth } from "@/hooks/useAuth";
import TripCard, { type TripCardViaje } from "@/components/conductor/TripCard";

const MOCK = process.env.NEXT_PUBLIC_MOCK === "true";

/**
 * Viajes disponibles — rediseño **sólo visual** (15-09). El flujo es el mismo:
 * lista de `GET /api/viajes/disponibles` + push `viaje:disponible` + aceptar por
 * `viaje:aceptar` (primero en aceptar). Ese flujo está congelado por
 * `OPEN.md` → D4; no agregar comportamiento sobre el mercado abierto.
 */

interface ViajeDisponible extends TripCardViaje {
  estado?: string;
  condiciones_req: { condicion: string }[];
}

interface ViajeAsignado {
  id_viaje: number;
  vehiculo: { patente: string; marca: string; modelo: string } | null;
}

export default function ConductorPage() {
  const [viajes, setViajes] = useState<ViajeDisponible[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  /** Cantidad de vehículos del conductor. Sin vehículos la lista siempre viene vacía. */
  const [cantVehiculos, setCantVehiculos] = useState<number | null>(null);
  const [aceptando, setAceptando] = useState<number | null>(null);
  const [asignado, setAsignado] = useState<ViajeAsignado | null>(null);
  const [yaAsignado, setYaAsignado] = useState<number | null>(null);
  const [errorAceptar, setErrorAceptar] = useState<string | null>(null);
  const [mapaAbierto, setMapaAbierto] = useState<number | null>(null);

  const { loading: authLoading } = useAuth();
  const { socket, connected } = useSocket();
  const socketRef = useRef(socket);
  const aceptandoRef = useRef<number | null>(null);
  const yaAsignadoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aceptandoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { socketRef.current = socket; }, [socket]);
  useEffect(() => { aceptandoRef.current = aceptando; }, [aceptando]);

  useEffect(() => {
    return () => {
      if (aceptandoTimerRef.current) clearTimeout(aceptandoTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (authLoading) return;
    api.get<ViajeDisponible[]>("/api/viajes/disponibles")
      .then(setViajes)
      .catch((err: Error) => {
        setApiError(err.message);
        setViajes([]);
      })
      .finally(() => setLoading(false));
    // Para poder explicar una lista vacía: el contrato filtra por elegibilidad
    // y un conductor sin vehículos no es elegible para ningún viaje.
    api.get<unknown[]>("/api/conductores/mis-vehiculos")
      .then((v) => setCantVehiculos(v.length))
      .catch(() => setCantVehiculos(null));
  }, [authLoading]);

  useEffect(() => {
    if (MOCK || !socket) return;

    const onDisponible = (data: ViajeDisponible) => {
      setViajes((prev) => {
        if (prev.some((v) => v.id_viaje === data.id_viaje)) return prev;
        return [data, ...prev];
      });
    };

    const onAsignado = (data: ViajeAsignado) => {
      setViajes((prev) => prev.filter((v) => v.id_viaje !== data.id_viaje));
      if (aceptandoRef.current === data.id_viaje) {
        if (aceptandoTimerRef.current) clearTimeout(aceptandoTimerRef.current);
        setAceptando(null);
        setAsignado(data);
      }
    };

    const onYaAsignado = (data: { id_viaje: number }) => {
      if (yaAsignadoTimerRef.current) clearTimeout(yaAsignadoTimerRef.current);
      setAceptando(null);
      setYaAsignado(data.id_viaje);
      setViajes((prev) => prev.filter((v) => v.id_viaje !== data.id_viaje));
      yaAsignadoTimerRef.current = setTimeout(() => setYaAsignado(null), 4000);
    };

    /**
     * Fix 15-09: la página escuchaba `viaje:no_disponible`, que no existe en el
     * contrato. Cuando un gerente reserva un viaje el servidor emite
     * `viaje:reservado` ("sale del pool") y el viaje quedaba en la lista del
     * conductor; al aceptarlo, el rechazo llegaba por `error` y tampoco se veía.
     * Es la misma escucha que ya tiene el panel del gerente.
     */
    const onNoDisponible = (data: { id_viaje: number }) => {
      setViajes((prev) => prev.filter((v) => v.id_viaje !== data.id_viaje));
    };

    /**
     * Fix 15-09: el servidor avisa los rechazos de `viaje:aceptar` SÓLO por el
     * evento `error` (p. ej. "No tenes un vehiculo que cumpla las condiciones
     * del viaje"). La página no lo escuchaba: el botón quedaba en "Aceptando..."
     * 10 s y volvía sin decir nada. El contrato usa `mensaje` o `error`.
     */
    const onError = (data: { mensaje?: string; error?: string }) => {
      if (aceptandoRef.current == null) return;
      if (aceptandoTimerRef.current) clearTimeout(aceptandoTimerRef.current);
      setAceptando(null);
      setErrorAceptar(data?.mensaje ?? data?.error ?? "El servidor rechazó la aceptación");
    };

    socket.on("viaje:disponible", onDisponible);
    socket.on("viaje:conductor_asignado", onAsignado);
    socket.on("viaje:ya_asignado", onYaAsignado);
    socket.on("viaje:reservado", onNoDisponible);
    socket.on("error", onError);

    return () => {
      socket.off("viaje:disponible", onDisponible);
      socket.off("viaje:conductor_asignado", onAsignado);
      socket.off("viaje:ya_asignado", onYaAsignado);
      socket.off("viaje:reservado", onNoDisponible);
      socket.off("error", onError);
      if (yaAsignadoTimerRef.current) clearTimeout(yaAsignadoTimerRef.current);
    };
  }, [socket]);

  function aceptarViaje(id_viaje: number) {
    setErrorAceptar(null);
    if (MOCK) {
      setAceptando(id_viaje);
      setTimeout(() => {
        setAsignado({ id_viaje, vehiculo: null });
        setViajes((prev) => prev.filter((v) => v.id_viaje !== id_viaje));
        setAceptando(null);
      }, 1200);
      return;
    }

    if (!socketRef.current) return;
    setAceptando(id_viaje);
    socketRef.current.emit("viaje:aceptar", { id_viaje });

    if (aceptandoTimerRef.current) clearTimeout(aceptandoTimerRef.current);
    aceptandoTimerRef.current = setTimeout(() => {
      if (aceptandoRef.current === id_viaje) {
        setAceptando(null);
        setErrorAceptar("El servidor no respondió. Revisá la conexión y probá de nuevo.");
      }
    }, 10_000);
  }

  if (asignado) {
    return (
      <div className="page-narrow">
        <div className="empty-state empty-state--solid">
          <div className="empty-state__icon empty-state__icon--ok">
            <CheckCircle2 size={26} />
          </div>
          <p className="empty-state__title">¡Viaje aceptado!</p>
          <p className="empty-state__text">
            Quedaste asignado al VJ-{asignado.id_viaje}
            {asignado.vehiculo ? ` con ${asignado.vehiculo.marca} ${asignado.vehiculo.modelo} (${asignado.vehiculo.patente})` : ""}.
            Lo vas a encontrar en <strong>Mis viajes → Próximos</strong> con el recorrido y la hora de inicio.
          </p>
          <div className="cluster">
            <button className="btn" type="button" onClick={() => setAsignado(null)}>Seguir buscando</button>
            <Link href={`/conductor/viajes/${asignado.id_viaje}`} className="btn btn--primary">Ver el viaje</Link>
          </div>
        </div>
      </div>
    );
  }

  const sinVehiculos = cantVehiculos === 0;

  return (
    <div className="page-wide">
      <div className="section-header">
        <div>
          <h2>Viajes disponibles</h2>
          <p>
            {loading
              ? "Buscando viajes para tus vehículos…"
              : viajes.length === 0
              ? "Ahora no hay viajes para vos"
              : `${viajes.length} viaje${viajes.length !== 1 ? "s" : ""} que tus vehículos pueden hacer`}
          </p>
        </div>
        {!MOCK && (
          <span className={`live-dot-text${connected ? " is-on" : ""}`}>
            {connected ? "Recibiendo viajes nuevos en vivo" : "Conectando…"}
          </span>
        )}
      </div>

      {apiError && <div className="error-banner">No se pudieron cargar los viajes: {apiError}</div>}

      {errorAceptar && (
        <div className="error-banner error-banner--row">
          <span>No se pudo aceptar el viaje: {errorAceptar}</span>
          <button type="button" className="btn btn--ghost" onClick={() => setErrorAceptar(null)}>Cerrar</button>
        </div>
      )}

      {yaAsignado && (
        <div className="note note--warn note--row" style={{ marginBottom: 14 }}>
          <span><strong>Otro conductor llegó primero</strong> al VJ-{yaAsignado}.</span>
          <button type="button" className="btn btn--ghost" onClick={() => setYaAsignado(null)}>Cerrar</button>
        </div>
      )}

      <div className="trip-cards">
        {loading && Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="trip-card skeleton" />
        ))}

        {!loading && !apiError && viajes.length === 0 && (
          sinVehiculos ? (
            <div className="empty-state">
              <div className="empty-state__icon"><Truck size={24} /></div>
              <p className="empty-state__title">Todavía no podés recibir viajes</p>
              <p className="empty-state__text">
                Un viaje te aparece sólo si tenés al menos un vehículo que cumpla sus condiciones, y no tenés
                ninguno cargado.
              </p>
              <Link href="/conductor/registro-vehiculo" className="btn btn--primary">Registrar mi vehículo</Link>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state__icon"><SearchX size={24} /></div>
              <p className="empty-state__title">No hay viajes para tus vehículos ahora</p>
              <p className="empty-state__text">
                Se muestran los viajes con fecha futura que nadie tomó todavía y que alguno de tus
                {cantVehiculos != null ? ` ${cantVehiculos} ` : " "}vehículo{cantVehiculos === 1 ? "" : "s"} puede hacer.
                Los nuevos aparecen solos en esta pantalla.
              </p>
              <Link href="/conductor/mis-vehiculos" className="btn">Revisar qué carga aceptan mis vehículos</Link>
            </div>
          )
        )}

        {!loading && viajes.map((viaje) => (
          <TripCard
            key={viaje.id_viaje}
            viaje={viaje}
            mapaAbierto={mapaAbierto === viaje.id_viaje}
            onToggleMapa={() => setMapaAbierto((m) => (m === viaje.id_viaje ? null : viaje.id_viaje))}
            acciones={
              <button
                type="button"
                className="btn btn--primary"
                disabled={aceptando != null}
                onClick={() => aceptarViaje(viaje.id_viaje)}
              >
                {aceptando === viaje.id_viaje ? "Aceptando…" : "Aceptar viaje"}
              </button>
            }
          />
        ))}
      </div>
    </div>
  );
}
