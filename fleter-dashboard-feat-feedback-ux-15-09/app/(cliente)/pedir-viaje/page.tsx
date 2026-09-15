"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import AddressInput from "@/components/AddressInput";

type Condicion = "FRAGIL" | "REFRIGERADO" | "CARGA_PESADA" | "PELIGROSO" | "VOLUMINOSO";

interface Parada {
  id: number;
  direccion: string;
  lat: number | null;
  lng: number | null;
}

interface ViajeCreado {
  id_viaje: number;
  estado: string;
  precio_estimado: number;
  /** La calcula el backend con las coordenadas de las paradas, no el front. */
  zona?: "CABA" | "PROVINCIA" | "MIXTO";
}

const ZONA_LABEL: Record<string, string> = {
  CABA: "CABA",
  PROVINCIA: "Provincia",
  MIXTO: "CABA + Provincia",
};

const CONDICIONES: { value: Condicion; label: string }[] = [
  { value: "FRAGIL", label: "Frágil" },
  { value: "REFRIGERADO", label: "Refrigerado" },
  { value: "CARGA_PESADA", label: "Carga pesada" },
  { value: "PELIGROSO", label: "Peligroso" },
  { value: "VOLUMINOSO", label: "Voluminoso" },
];

/**
 * Anticipación mínima para programar un viaje, en minutos.
 *
 * La autoridad es el backend (`ANTICIPACION_MINIMA_MINUTOS`, default 60): valida
 * el mínimo y responde `400` si no se cumple. Acá se replica sólo para evitar el
 * ida y vuelta. En staging el backend la baja (incluso a 0) para poder crear un
 * viaje y debuggearlo al toque, así que esto tiene que poder acompañarlo.
 */
const ANTICIPACION_MINIMA_MINUTOS = Number(
  process.env.NEXT_PUBLIC_ANTICIPACION_MINIMA_MINUTOS ?? 60,
);

/**
 * Mínimo del `<input type="datetime-local">`, que espera **hora local**.
 *
 * No usar `toISOString()`: devuelve UTC, y en UTC-3 eso corría el mínimo tres
 * horas hacia adelante — el cliente no podía elegir un horario que el backend
 * sí aceptaba.
 */
function getMinFecha() {
  const d = new Date();
  d.setMinutes(d.getMinutes() + ANTICIPACION_MINIMA_MINUTOS);
  const pad = (n: number) => String(n).padStart(2, "0");
  // "YYYY-MM-DDTHH:MM" en hora local
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

export default function PedirViajePage() {
  const router = useRouter();
  const nextIdRef = useRef(3);

  const [fecha, setFecha] = useState("");
  const [paradas, setParadas] = useState<Parada[]>([
    { id: 1, direccion: "", lat: null, lng: null },
    { id: 2, direccion: "", lat: null, lng: null },
  ]);
  const [condiciones, setCondiciones] = useState<Set<Condicion>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<ViajeCreado | null>(null);

  function agregarParada() {
    const destino = paradas[paradas.length - 1];
    const intermedias = paradas.slice(0, -1);
    setParadas([...intermedias, { id: nextIdRef.current++, direccion: "", lat: null, lng: null }, destino]);
  }

  function borrarParada(id: number) {
    setParadas((prev) => prev.filter((p) => p.id !== id));
  }

  function actualizarTexto(id: number, text: string) {
    setParadas((prev) => prev.map((p) => (p.id === id ? { ...p, direccion: text, lat: null, lng: null } : p)));
  }

  function actualizarCoords(id: number, address: string, lat: number, lng: number) {
    setParadas((prev) => prev.map((p) => (p.id === id ? { ...p, direccion: address, lat, lng } : p)));
  }

  function limpiarCoords(id: number) {
    setParadas((prev) => prev.map((p) => (p.id === id ? { ...p, lat: null, lng: null } : p)));
  }

  function toggleCondicion(c: Condicion) {
    setCondiciones((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fecha) {
      setError("Seleccioná la fecha y hora del viaje.");
      return;
    }

    if (paradas.some((p) => !p.direccion.trim())) {
      setError("Completá todas las direcciones.");
      return;
    }

    if (paradas.some((p) => p.lat === null || p.lng === null)) {
      setError("Seleccioná cada dirección desde el menú de sugerencias para confirmar la ubicación.");
      return;
    }

    setLoading(true);
    try {
      // Sin `zona`: la deriva el backend de las coordenadas de las paradas
      // (polígono oficial de CABA). El campo se sigue aceptando en el body por
      // compatibilidad, pero su valor se descarta — mandarlo sólo confundiría.
      const payload = {
        fecha_programada: new Date(fecha).toISOString(),
        paradas: paradas.map((p) => ({ lat: p.lat!, lng: p.lng!, direccion: p.direccion.trim() })),
        condiciones_requeridas: Array.from(condiciones),
      };
      const result = await api.post<ViajeCreado>("/api/viajes", payload);
      setSuccess(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear el viaje.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div>
        <div className="section-header" style={{ marginBottom: 24 }}>
          <h2>Viaje solicitado</h2>
          <p>Tu pedido fue enviado. Estamos buscando un conductor.</p>
        </div>
        <div className="card" style={{ maxWidth: 520 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-start" }}>
            <div>
              <p className="metric__label">N° de viaje</p>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 18, color: "var(--ink)", marginTop: 4 }}>
                VJ-{success.id_viaje}
              </p>
            </div>
            <div>
              <p className="metric__label">Estado</p>
              <span className="status BUSCANDO_FLETERO" style={{ marginTop: 4, display: "inline-flex" }}>
                Buscando conductor
              </span>
            </div>
            {success.zona && (
              <div>
                <p className="metric__label">Zona</p>
                <p style={{ fontSize: 15, color: "var(--ink)", marginTop: 4 }}>
                  {ZONA_LABEL[success.zona] ?? success.zona}
                </p>
              </div>
            )}
            {success.precio_estimado > 0 && (
              <div>
                <p className="metric__label">Precio estimado</p>
                <p style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--ink)", marginTop: 4 }}>
                  ${success.precio_estimado.toLocaleString("es-AR")}
                </p>
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button
                className="btn btn--primary"
                onClick={() => router.push("/viajes")}
              >
                Ver mis viajes
              </button>
              <button
                className="btn btn--ghost"
                onClick={() => setSuccess(null)}
              >
                Pedir otro viaje
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const coordsCompletas = paradas.every((p) => p.lat !== null && p.lng !== null);

  return (
    <div>
      <div className="section-header" style={{ marginBottom: 24 }}>
        <h2>Pedir un viaje</h2>
        <p>Completá los datos del flete y te conectamos con un conductor.</p>
      </div>

      <form onSubmit={handleSubmit} style={{ maxWidth: 560 }}>
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Fecha programada */}
          <div>
            <label
              htmlFor="fecha"
              style={{ display: "block", fontSize: 11.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 8 }}
            >
              Fecha y hora
            </label>
            <input
              id="fecha"
              type="datetime-local"
              min={getMinFecha()}
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--line-strong)",
                background: "var(--surface)",
                color: "var(--ink)",
                fontSize: 13,
                fontFamily: "var(--font-ui)",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Paradas estilo Uber */}
          <div>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 8 }}>
              Recorrido
            </label>
            <div style={{ position: "relative" }}>
              {/* Línea vertical */}
              <div style={{
                position: "absolute",
                left: 10,
                top: 18,
                bottom: 18,
                width: 1.5,
                background: "var(--line-strong)",
              }} />

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {paradas.map((parada, idx) => {
                  const isOrigen = idx === 0;
                  const isDestino = idx === paradas.length - 1;
                  const isIntermedia = !isOrigen && !isDestino;

                  const dotColor = isOrigen
                    ? "var(--accent)"
                    : isDestino
                    ? "var(--ink)"
                    : "var(--ink-3)";

                  return (
                    <div key={parada.id} style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }}>
                      {/* Dot */}
                      <div style={{
                        width: 20,
                        height: 20,
                        borderRadius: isDestino ? "3px" : "50%",
                        background: dotColor,
                        border: "2.5px solid var(--surface)",
                        boxShadow: `0 0 0 1.5px ${dotColor}`,
                        flexShrink: 0,
                      }} />

                      {/* AddressInput con autocomplete */}
                      <AddressInput
                        placeholder={isOrigen ? "Origen" : isDestino ? "Destino" : `Parada ${idx}`}
                        value={parada.direccion}
                        onChange={(text) => actualizarTexto(parada.id, text)}
                        onSelect={({ address, lat, lng }) => actualizarCoords(parada.id, address, lat, lng)}
                        onClear={() => limpiarCoords(parada.id)}
                      />

                      {/* Botón borrar (solo intermedias) */}
                      {isIntermedia && (
                        <button
                          type="button"
                          onClick={() => borrarParada(parada.id)}
                          style={{
                            width: 24,
                            height: 24,
                            border: "none",
                            background: "none",
                            color: "var(--ink-3)",
                            cursor: "pointer",
                            fontSize: 16,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: 0,
                            flexShrink: 0,
                          }}
                          title="Eliminar parada"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={agregarParada}
              className="btn btn--ghost"
              style={{ marginTop: 10, fontSize: 12.5, color: "var(--ink-3)", paddingLeft: 4 }}
            >
              + Agregar parada intermedia
            </button>
          </div>

          {/* Condiciones requeridas */}
          <div>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 8 }}>
              Condiciones especiales <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(opcional)</span>
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {CONDICIONES.map(({ value, label }) => {
                const active = condiciones.has(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleCondicion(value)}
                    style={{
                      padding: "5px 12px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid",
                      borderColor: active ? "var(--info)" : "var(--line-strong)",
                      background: active ? "var(--info-soft)" : "var(--surface)",
                      color: active ? "var(--info)" : "var(--ink-2)",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error */}
          {error && (
            <p style={{ fontSize: 12.5, color: "var(--err)", background: "var(--err-soft)", padding: "8px 12px", borderRadius: "var(--radius-sm)" }}>
              {error}
            </p>
          )}

          {/* Submit */}
          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 16 }}>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={loading || !coordsCompletas}
              style={{ width: "100%", justifyContent: "center", opacity: loading || !coordsCompletas ? 0.5 : 1 }}
            >
              {loading ? "Enviando..." : "Confirmar viaje"}
            </button>
          </div>

        </div>
      </form>
    </div>
  );
}
