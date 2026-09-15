"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatARS, fmtDateTime } from "@/lib/utils";
import { ESTADO_LABEL, ESTADOS_EN_CURSO, ESTADOS_TERMINALES } from "@/lib/estados";
import { useSocket } from "@/hooks/useSocket";
import { useEmpresa } from "@/hooks/useEmpresa";
import type { RequiereReasignacion, ViajeEmpresa } from "@/lib/types-empresa";

const MOCK = process.env.NEXT_PUBLIC_MOCK === "true";

/** Default de RESERVA_TIMEOUT_MINUTOS en el backend. */
const RESERVA_TIMEOUT_MIN = 10;

function MinutosRestantes({ fechaReserva }: { fechaReserva: string }) {
  const vence = new Date(fechaReserva).getTime() + RESERVA_TIMEOUT_MIN * 60_000;
  const [restante, setRestante] = useState(() => vence - Date.now());

  useEffect(() => {
    const id = setInterval(() => setRestante(vence - Date.now()), 1000);
    return () => clearInterval(id);
  }, [vence]);

  if (restante <= 0) {
    return (
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--err)" }}>
        Reserva vencida
      </span>
    );
  }

  const min = Math.floor(restante / 60_000);
  const seg = Math.floor((restante % 60_000) / 1000);
  return (
    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: min < 3 ? "var(--err)" : "var(--warn)" }}>
      {min}:{String(seg).padStart(2, "0")} para asignar
    </span>
  );
}

function FilaViaje({ viaje }: { viaje: ViajeEmpresa }) {
  const origen = viaje.paradas.find((p) => p.orden === 1);
  const destino = viaje.paradas[viaje.paradas.length - 1];

  return (
    <Link
      href={`/gerente/viajes/${viaje.id_viaje}`}
      className="card"
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, textDecoration: "none" }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-3)" }}>
            VJ-{viaje.id_viaje}
          </span>
          <span className={`status ${viaje.estado}`}>{ESTADO_LABEL[viaje.estado]}</span>
          <span className={`zone-tag ${viaje.zona}`}>{viaje.zona}</span>
          {viaje.estado === "RESERVADO_POR_EMPRESA" && viaje.fecha_reserva && (
            <MinutosRestantes fechaReserva={viaje.fecha_reserva} />
          )}
        </div>
        <p style={{ fontSize: 13, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {origen?.direccion} → {destino?.direccion}
        </p>
        <p style={{ fontSize: 12, color: "var(--ink-3)" }}>
          {fmtDateTime(viaje.fecha_programada)}
          {viaje.conductor
            ? ` · ${viaje.conductor.usuario.nombre} ${viaje.conductor.usuario.apellido}`
            : " · sin conductor"}
        </p>
      </div>
      <p style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--ink)", flexShrink: 0 }}>
        {formatARS(viaje.precio_real ?? viaje.precio_estimado)}
      </p>
    </Link>
  );
}

function Bloque({
  titulo,
  descripcion,
  viajes,
}: {
  titulo: string;
  descripcion?: string;
  viajes: ViajeEmpresa[];
}) {
  if (viajes.length === 0) return null;
  return (
    <section style={{ marginBottom: 28 }}>
      <div className="section-header" style={{ marginBottom: 12 }}>
        <h2 style={{ fontSize: 16 }}>{titulo} <span style={{ color: "var(--ink-3)" }}>({viajes.length})</span></h2>
        {descripcion && <p>{descripcion}</p>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {viajes.map((v) => <FilaViaje key={v.id_viaje} viaje={v} />)}
      </div>
    </section>
  );
}

export default function GerenteViajesPage() {
  const [viajes, setViajes] = useState<ViajeEmpresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reasignaciones, setReasignaciones] = useState<RequiereReasignacion[]>([]);

  const { empresaActiva, loading: empresaLoading } = useEmpresa();
  const { socket } = useSocket();
  const idEmpresa = empresaActiva?.id_empresa;

  const cargar = useCallback(async () => {
    if (!idEmpresa) return;
    setLoading(true);
    try {
      const data = await api.get<ViajeEmpresa[]>(`/api/empresas/${idEmpresa}/viajes`);
      setViajes(data);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
      setViajes([]);
    } finally {
      setLoading(false);
    }
  }, [idEmpresa]);

  // Carga inicial inline: llamar a `cargar()` haría setState de forma síncrona
  // dentro del efecto, que es lo que prohíbe react-hooks/set-state-in-effect.
  useEffect(() => {
    if (!idEmpresa) return;
    let cancelled = false;
    api
      .get<ViajeEmpresa[]>(`/api/empresas/${idEmpresa}/viajes`)
      .then((data) => {
        if (cancelled) return;
        setViajes(data);
        setError(null);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
        setViajes([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [idEmpresa]);

  useEffect(() => {
    if (MOCK || !socket) return;

    // Un viaje ya asignado volvió a RESERVADO_POR_EMPRESA y hay que reasignarlo.
    const onReasignacion = (data: RequiereReasignacion) => {
      setReasignaciones((prev) =>
        prev.some((r) => r.id_viaje === data.id_viaje) ? prev : [...prev, data],
      );
      void cargar();
    };

    socket.on("viaje:requiere_reasignacion", onReasignacion);
    return () => {
      socket.off("viaje:requiere_reasignacion", onReasignacion);
    };
  }, [socket, cargar]);

  const requierenAccion = viajes.filter((v) => v.estado === "RESERVADO_POR_EMPRESA");
  const porArrancar = viajes.filter((v) => v.estado === "CONDUCTOR_ASIGNADO");
  const enCurso = viajes.filter((v) => ESTADOS_EN_CURSO.includes(v.estado));
  const historico = viajes.filter((v) => ESTADOS_TERMINALES.includes(v.estado));

  if (!empresaLoading && !idEmpresa) {
    // Sin empresa no hay nada que cargar; este return va antes del skeleton.
    return (
      <div className="card" style={{ textAlign: "center", padding: "32px 24px" }}>
        <p style={{ fontSize: 14, color: "var(--ink-2)" }}>
          Todavía no tenés una empresa. Creá una en <strong>Mi empresa</strong>.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="section-header" style={{ marginBottom: 24 }}>
        <h2>Mis viajes</h2>
        <p>{loading ? "Cargando..." : `${viajes.length} viaje${viajes.length !== 1 ? "s" : ""} de la empresa`}</p>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: "var(--radius-sm)", background: "var(--err-soft)", borderLeft: "3px solid var(--err)", marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: "var(--err)" }}>Error al cargar viajes: {error}</p>
        </div>
      )}

      {reasignaciones.map((r) => (
        <div
          key={r.id_viaje}
          style={{ marginBottom: 12, padding: "12px 16px", borderRadius: "var(--radius-sm)", background: "var(--err-soft)", borderLeft: "3px solid var(--err)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
        >
          <p style={{ fontSize: 13, color: "var(--err)" }}>
            <strong>VJ-{r.id_viaje} necesita reasignación</strong> —{" "}
            {r.motivo === "conductor_cancelo"
              ? "el conductor canceló."
              : "el conductor fue desafiliado."}
          </p>
          <Link href={`/gerente/viajes/${r.id_viaje}`} className="btn btn--primary">
            Reasignar
          </Link>
        </div>
      ))}

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card" style={{ height: 78, background: "var(--surface-2)" }} />
          ))}
        </div>
      ) : viajes.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "32px 24px" }}>
          <p style={{ fontSize: 14, color: "var(--ink-2)", marginBottom: 6 }}>
            Tu empresa todavía no tomó ningún viaje.
          </p>
          <p style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
            Reservá uno desde <strong>Viajes disponibles</strong>.
          </p>
        </div>
      ) : (
        <>
          <Bloque
            titulo="Requieren acción"
            descripcion={`Reservados sin conductor. Si no los asignás en ${RESERVA_TIMEOUT_MIN} minutos vuelven al mercado.`}
            viajes={requierenAccion}
          />
          <Bloque
            titulo="Por arrancar"
            descripcion="Con conductor asignado, todavía sin iniciar."
            viajes={porArrancar}
          />
          <Bloque titulo="En curso" viajes={enCurso} />
          <Bloque titulo="Histórico" viajes={historico} />
        </>
      )}
    </div>
  );
}
