"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useEmpresa } from "@/hooks/useEmpresa";
import type { ConductorEmpresa } from "@/lib/types-empresa";

export default function ConductoresPage() {
  const { empresaActiva, loading: empresaLoading } = useEmpresa();

  const [conductores, setConductores] = useState<ConductorEmpresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [aprobandoId, setAprobandoId] = useState<number | null>(null);
  const [aprobarError, setAprobarError] = useState<string | null>(null);

  const [desafiliarId, setDesafiliarId] = useState<number | null>(null);
  const [confirmandoId, setConfirmandoId] = useState<number | null>(null);
  const [desafiliarError, setDesafiliarError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!empresaActiva) {
      setConductores([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setListError("");
    try {
      const data = await api.get<ConductorEmpresa[]>(
        `/api/empresas/${empresaActiva.id_empresa}/conductores`
      );
      setConductores(data);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Error al cargar conductores");
      setConductores([]);
    } finally {
      setLoading(false);
    }
  }, [empresaActiva]);

  useEffect(() => {
    if (empresaLoading) return;

    if (!empresaActiva) return;

    let cancelado = false;
    api
      .get<ConductorEmpresa[]>(`/api/empresas/${empresaActiva.id_empresa}/conductores`)
      .then((data) => {
        if (!cancelado) {
          setConductores(data);
          setListError("");
        }
      })
      .catch((err) => {
        if (!cancelado) {
          setListError(err instanceof Error ? err.message : "Error al cargar conductores");
          setConductores([]);
        }
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });

    return () => {
      cancelado = true;
    };
  }, [empresaLoading, empresaActiva]);

  async function handleAprobar(id_conductor: number) {
    if (!empresaActiva) return;
    setAprobandoId(id_conductor);
    setAprobarError(null);
    try {
      await api.post(
        `/api/empresas/${empresaActiva.id_empresa}/conductores/${id_conductor}/aprobar`,
        {}
      );
      await cargar();
    } catch (err) {
      setAprobarError(err instanceof Error ? err.message : "Error al aprobar el conductor");
    } finally {
      setAprobandoId(null);
    }
  }

  async function handleDesafiliar(id_conductor: number) {
    if (!empresaActiva) return;
    if (confirmandoId !== id_conductor) {
      setConfirmandoId(id_conductor);
      setDesafiliarError(null);
      return;
    }
    setDesafiliarId(id_conductor);
    setDesafiliarError(null);
    try {
      await api.delete(`/api/empresas/${empresaActiva.id_empresa}/conductores/${id_conductor}`);
      setConfirmandoId(null);
      await cargar();
    } catch (err) {
      setDesafiliarError(err instanceof Error ? err.message : "Error al desafiliar el conductor");
    } finally {
      setDesafiliarId(null);
    }
  }

  if (!empresaLoading && !empresaActiva) {
    return (
      <div>
        <div className="section-header" style={{ marginBottom: 24 }}>
          <h2>Conductores</h2>
          <p>No tenés ninguna empresa todavía.</p>
        </div>
      </div>
    );
  }

  const pendientes = conductores.filter((c) => c.estado === "PENDIENTE");
  const activos = conductores.filter((c) => c.estado === "ACTIVO");

  return (
    <div>
      <div className="section-header" style={{ marginBottom: 24 }}>
        <h2>Conductores</h2>
        <p>
          {loading || empresaLoading
            ? "Cargando..."
            : conductores.length === 0
            ? "No hay conductores afiliados todavía."
            : `${activos.length} activo${activos.length !== 1 ? "s" : ""}${
                pendientes.length > 0
                  ? `, ${pendientes.length} pendiente${pendientes.length !== 1 ? "s" : ""}`
                  : ""
              }`}
        </p>
      </div>

      {listError && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "var(--radius-sm)",
            background: "var(--err-soft)",
            borderLeft: "3px solid var(--err)",
            marginBottom: 16,
          }}
        >
          <p style={{ fontSize: 13, color: "var(--err)" }}>{listError}</p>
        </div>
      )}

      {aprobarError && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "var(--radius-sm)",
            background: "var(--err-soft)",
            borderLeft: "3px solid var(--err)",
            marginBottom: 16,
          }}
        >
          <p style={{ fontSize: 13, color: "var(--err)" }}>{aprobarError}</p>
        </div>
      )}

      {desafiliarError && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "var(--radius-sm)",
            background: "var(--err-soft)",
            borderLeft: "3px solid var(--err)",
            marginBottom: 16,
          }}
        >
          <p style={{ fontSize: 13, color: "var(--err)" }}>{desafiliarError}</p>
        </div>
      )}

      {(loading || empresaLoading) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card" style={{ height: 72, background: "var(--surface-2)" }} />
          ))}
        </div>
      )}

      {!loading && !empresaLoading && !listError && conductores.length === 0 && (
        <div className="card" style={{ padding: "40px 28px", textAlign: "center" }}>
          <p style={{ color: "var(--ink-3)", fontSize: 14 }}>No hay conductores afiliados todavía.</p>
        </div>
      )}

      {!loading && !empresaLoading && pendientes.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--warn)", marginBottom: 10 }}>
            Solicitudes pendientes
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pendientes.map((c) => (
              <div
                key={c.id_conductor}
                style={{
                  padding: "14px 18px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--warn-soft)",
                  borderLeft: "3px solid var(--warn)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>
                  {c.usuario.nombre} {c.usuario.apellido}
                </p>
                <button
                  className="btn btn--primary"
                  disabled={aprobandoId === c.id_conductor}
                  onClick={() => handleAprobar(c.id_conductor)}
                >
                  {aprobandoId === c.id_conductor ? "Aprobando..." : "Aprobar"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !empresaLoading && activos.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {activos.map((c) => (
            <div
              key={c.id_conductor}
              className="card"
              style={{
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>
                  {c.usuario.nombre} {c.usuario.apellido}
                </p>
                <p style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 2 }}>
                  {c.calificacion_promedio === null
                    ? "—"
                    : `★ ${c.calificacion_promedio.toFixed(1)}`}
                </p>
              </div>
              <button
                className="btn btn--ghost"
                style={{ fontSize: 13, color: "var(--err)", flexShrink: 0 }}
                disabled={desafiliarId === c.id_conductor}
                onClick={() => handleDesafiliar(c.id_conductor)}
              >
                {desafiliarId === c.id_conductor
                  ? "Desafiliando..."
                  : confirmandoId === c.id_conductor
                  ? "¿Confirmar?"
                  : "Desafiliar"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
