"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, esStatus } from "@/lib/api";
import { formatARS, fmtDateTime } from "@/lib/utils";
import { useSocket } from "@/hooks/useSocket";
import { useEmpresa } from "@/hooks/useEmpresa";
import { CONDICION_LABEL, type ViajeDisponibleGerente } from "@/lib/types-empresa";

const MOCK = process.env.NEXT_PUBLIC_MOCK === "true";

/**
 * Viajes disponibles para reservar. Hay dos fuentes que se complementan:
 *
 * - Pull REST (`GET /api/empresas/:id/viajes-disponibles`): lo que ya estaba
 *   publicado cuando el gerente entró o recargó.
 * - Push socket (`viaje:disponible`): lo que se publica mientras mira.
 *
 * Ambas aplican la misma regla de elegibilidad del lado del servidor (comparten
 * helper), así que no se pueden desincronizar. Ver lib/types-empresa.ts por qué
 * el payload del socket trae menos campos que el REST.
 */
function fetchViajesDisponibles(idEmpresa: number): Promise<ViajeDisponibleGerente[]> {
  return api.get<ViajeDisponibleGerente[]>(`/api/empresas/${idEmpresa}/viajes-disponibles`);
}

/**
 * Orden por `fecha_programada` ascendente, el mismo que ya devuelve el REST.
 *
 * Importa más de lo que parece: si los viajes que llegan por socket se metieran
 * arriba de todo, cada push correría los botones "Reservar" hacia abajo y el
 * gerente podría terminar reservando un viaje distinto al que estaba mirando.
 * Con un orden estable, un viaje nuevo cae donde le corresponde por fecha.
 */
function ordenarPorFecha(lista: ViajeDisponibleGerente[]): ViajeDisponibleGerente[] {
  return [...lista].sort(
    (a, b) => +new Date(a.fecha_programada) - +new Date(b.fecha_programada),
  );
}

function useViajesDisponiblesMock(push: (v: ViajeDisponibleGerente) => void): void {
  useEffect(() => {
    if (!MOCK) return;
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      push({
        id_viaje: 900 + n,
        zona: n % 2 === 0 ? "PROVINCIA" : "CABA",
        precio_estimado: 2500 + n * 850,
        fecha_programada: new Date(Date.now() + (n + 2) * 60 * 60 * 1000).toISOString(),
        descripcion: n % 2 === 0 ? "Carga frágil, portón azul" : null,
        paradas: [
          { orden: 1, direccion: "Plaza de Mayo, CABA" },
          { orden: 2, direccion: n % 2 === 0 ? "La Plata, Buenos Aires" : "Recoleta, CABA" },
        ],
        condiciones_req: n % 2 === 0 ? [{ condicion: "FRAGIL" }] : [],
      });
    }, 4000);
    return () => clearInterval(id);
  }, [push]);
}

export default function GerenteDisponiblesPage() {
  const [viajes, setViajes] = useState<ViajeDisponibleGerente[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [reservando, setReservando] = useState<number | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const router = useRouter();
  const { socket, connected } = useSocket();
  const { empresaActiva, loading: empresaLoading } = useEmpresa();
  const idEmpresa = empresaActiva?.id_empresa;

  // Derivado en vez de un `setLoading(false)` suelto: si el gerente todavía no
  // tiene empresa no hay nada que pedir, y al cambiar de empresa vuelve a
  // "cargando" sin hacer setState dentro del efecto.
  const [cargadoPara, setCargadoPara] = useState<number | null>(null);
  const loading = empresaLoading || (idEmpresa !== undefined && cargadoPara !== idEmpresa);

  const avisoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pushesDuranteCarga = useRef<ViajeDisponibleGerente[]>([]);

  const agregarViaje = useCallback((data: ViajeDisponibleGerente) => {
    // La respuesta REST reemplaza la lista entera cuando llega, así que un push
    // que caiga en el medio del fetch se perdería si sólo tocara el estado.
    pushesDuranteCarga.current.push(data);
    setViajes((prev) =>
      prev.some((v) => v.id_viaje === data.id_viaje) ? prev : ordenarPorFecha([...prev, data]),
    );
  }, []);

  const mostrarAviso = useCallback((msg: string) => {
    if (avisoTimerRef.current) clearTimeout(avisoTimerRef.current);
    setAviso(msg);
    avisoTimerRef.current = setTimeout(() => setAviso(null), 5000);
  }, []);

  useEffect(() => {
    return () => {
      if (avisoTimerRef.current) clearTimeout(avisoTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (idEmpresa === undefined) return;
    let cancelled = false;
    pushesDuranteCarga.current = [];
    fetchViajesDisponibles(idEmpresa)
      .then((data) => {
        if (cancelled) return;
        // No se puede mergear contra el estado previo: si el gerente acaba de
        // cambiar de empresa, esa lista es de la empresa anterior. Sólo se
        // rescatan los pushes que llegaron durante este fetch.
        const traidos = new Set(data.map((v) => v.id_viaje));
        const rescatados = pushesDuranteCarga.current.filter((v) => !traidos.has(v.id_viaje));
        setViajes(ordenarPorFecha([...rescatados, ...data]));
        setApiError(null);
      })
      .catch((err: Error) => {
        if (!cancelled) setApiError(err.message);
      })
      .finally(() => {
        if (!cancelled) setCargadoPara(idEmpresa);
      });
    return () => {
      cancelled = true;
    };
  }, [idEmpresa]);

  useViajesDisponiblesMock(agregarViaje);

  useEffect(() => {
    if (MOCK || !socket) return;

    // El servidor emite por elegibilidad de la empresa del gerente, no de la
    // empresa que está mirando. Con más de una empresa puede caer un push que no
    // corresponda a `empresaActiva`; el REST es la fuente autoritativa por empresa.
    socket.on("viaje:disponible", agregarViaje);

    // Otra empresa (o un conductor independiente) se lo llevó: sale del pool.
    const quitar = (data: { id_viaje: number }) =>
      setViajes((prev) => prev.filter((v) => v.id_viaje !== data.id_viaje));

    socket.on("viaje:reservado", quitar);
    socket.on("viaje:conductor_asignado", quitar);
    // `viaje:reserva_cancelada` no se maneja: cuando una reserva se suelta, el
    // servidor republica el viaje de cero y vuelve a llegar `viaje:disponible`.

    return () => {
      socket.off("viaje:disponible", agregarViaje);
      socket.off("viaje:reservado", quitar);
      socket.off("viaje:conductor_asignado", quitar);
    };
  }, [socket, agregarViaje]);

  async function reservar(id_viaje: number) {
    if (!empresaActiva) return;
    setReservando(id_viaje);
    try {
      await api.post(`/api/viajes/${id_viaje}/reservar`, {
        id_empresa: empresaActiva.id_empresa,
      });
      setViajes((prev) => prev.filter((v) => v.id_viaje !== id_viaje));
      router.push(`/gerente/viajes/${id_viaje}`);
    } catch (err) {
      // La reserva es atómica: el backend responde 409 cuando otro gerente ganó
      // y el viaje ya salió del pool. Sólo en ese caso corresponde sacarlo de la
      // lista; ante cualquier otro error (red, 500) el viaje sigue disponible y
      // borrarlo escondería un viaje reservable hasta el próximo refetch.
      if (esStatus(err, 409)) {
        setViajes((prev) => prev.filter((v) => v.id_viaje !== id_viaje));
        mostrarAviso(`VJ-${id_viaje} ya fue reservado por otra empresa.`);
      } else {
        mostrarAviso(`No se pudo reservar VJ-${id_viaje}: ${(err as Error).message}`);
      }
    } finally {
      setReservando(null);
    }
  }

  return (
    <div>
      <div className="section-header" style={{ marginBottom: 24 }}>
        <h2>Viajes disponibles</h2>
        <p>
          {loading
            ? "Cargando..."
            : viajes.length === 0
            ? "No hay viajes disponibles en este momento."
            : `${viajes.length} viaje${viajes.length !== 1 ? "s" : ""} para reservar`}
        </p>
        {!MOCK && (
          <p style={{ fontSize: 11.5, marginTop: 4, color: connected ? "var(--ok)" : "var(--ink-3)" }}>
            {connected ? "● Conectado en tiempo real" : "○ Conectando..."}
          </p>
        )}
      </div>

      {apiError && (
        <div style={{ padding: "12px 16px", borderRadius: "var(--radius-sm)", background: "var(--err-soft)", borderLeft: "3px solid var(--err)", marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: "var(--err)" }}>Error al cargar viajes: {apiError}</p>
        </div>
      )}

      {!empresaActiva && !loading && (
        <div style={{ padding: "12px 16px", borderRadius: "var(--radius-sm)", background: "var(--warn-soft)", borderLeft: "3px solid var(--warn)", marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: "var(--warn)" }}>
            Todavía no tenés una empresa. Creá una en <strong>Mi empresa</strong> para poder reservar viajes.
          </p>
        </div>
      )}

      {aviso && (
        <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: "var(--radius-sm)", background: "var(--warn-soft)", borderLeft: "3px solid var(--warn)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--warn)" }}>⚡ {aviso}</p>
          <button
            onClick={() => setAviso(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--warn)", fontSize: 18, lineHeight: 1, padding: 0 }}
          >
            ×
          </button>
        </div>
      )}

      {!loading && viajes.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: "32px 24px" }}>
          <p style={{ fontSize: 14, color: "var(--ink-2)", marginBottom: 6 }}>
            No hay viajes esperando en este momento.
          </p>
          <p style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
            Los viajes aparecen acá apenas se publican, sin necesidad de recargar.
            Sólo llegan los que tu flota puede cubrir.
          </p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {loading
          ? Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="card" style={{ height: 120, background: "var(--surface-2)" }} />
            ))
          : viajes.map((viaje) => {
              const origen = viaje.paradas.find((p) => p.orden === 1);
              const destino = viaje.paradas[viaje.paradas.length - 1];
              const intermedias = viaje.paradas.length - 2;

              return (
                <div key={viaje.id_viaje} className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-3)" }}>
                        VJ-{viaje.id_viaje}
                      </span>
                      <span className={`zone-tag ${viaje.zona}`}>{viaje.zona}</span>
                      {viaje.condiciones_req.map((c) => (
                        <span
                          key={c.condicion}
                          style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "var(--info-soft)", color: "var(--info)", letterSpacing: "0.04em" }}
                        >
                          {CONDICION_LABEL[c.condicion] ?? c.condicion}
                        </span>
                      ))}
                    </div>
                    <p style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--ink)", flexShrink: 0 }}>
                      {formatARS(viaje.precio_estimado)}
                    </p>
                  </div>

                  <div style={{ position: "relative", paddingLeft: 28 }}>
                    <div style={{ position: "absolute", left: 8, top: 10, bottom: 10, width: 1.5, background: "var(--line-strong)" }} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ position: "absolute", left: 3, width: 11, height: 11, borderRadius: "50%", background: "var(--accent)", border: "2px solid var(--surface)", boxShadow: "0 0 0 1.5px var(--accent)" }} />
                        <p style={{ fontSize: 13, color: "var(--ink)" }}>{origen?.direccion}</p>
                      </div>
                      {intermedias > 0 && (
                        <p style={{ fontSize: 12, color: "var(--ink-3)", paddingLeft: 4 }}>
                          + {intermedias} parada{intermedias !== 1 ? "s" : ""} intermedia{intermedias !== 1 ? "s" : ""}
                        </p>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ position: "absolute", left: 3, width: 11, height: 11, borderRadius: 2, background: "var(--ink)", border: "2px solid var(--surface)", boxShadow: "0 0 0 1.5px var(--ink)" }} />
                        <p style={{ fontSize: 13, color: "var(--ink)" }}>{destino?.direccion}</p>
                      </div>
                    </div>
                  </div>

                  {viaje.descripcion && (
                    <p style={{ fontSize: 12.5, color: "var(--ink-2)", fontStyle: "italic" }}>
                      &ldquo;{viaje.descripcion}&rdquo;
                    </p>
                  )}

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                    <p style={{ fontSize: 12, color: "var(--ink-3)" }}>
                      {fmtDateTime(viaje.fecha_programada)}
                    </p>
                    <button
                      className="btn btn--primary"
                      disabled={reservando === viaje.id_viaje || !empresaActiva}
                      onClick={() => reservar(viaje.id_viaje)}
                      style={{ opacity: reservando === viaje.id_viaje ? 0.7 : 1 }}
                    >
                      {reservando === viaje.id_viaje ? "Reservando..." : "Reservar"}
                    </button>
                  </div>
                </div>
              );
            })}
      </div>
    </div>
  );
}
