"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { formatARS, fmtDateTime } from "@/lib/utils";
import type { AdminViajeDetalle, CancelarViajeResponse } from "@/lib/types-admin";

const TERMINALES = new Set(["FINALIZADO", "CANCELADO"]);

export default function AdminViajeDetallePage() {
  const { id } = useParams<{ id: string }>();
  const [v, setV] = useState<AdminViajeDetalle | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [confirming, setConfirming] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  function load() {
    api.get<AdminViajeDetalle>(`/api/admin/viajes/${id}`)
      .then((d) => { setV(d); setError(null); })
      .catch((e) => setError(e instanceof Error ? e.message : "Error al cargar"));
  }

  useEffect(load, [id]);

  async function handleCancelar() {
    setCancelling(true);
    setCancelError(null);
    try {
      await api.post<CancelarViajeResponse>(`/api/admin/viajes/${id}/cancelar`, motivo ? { motivo } : {});
      setConfirming(false);
      setMotivo("");
      load();
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : "No se pudo cancelar");
    } finally {
      setCancelling(false);
    }
  }

  if (error) return <p className="admin-error">{error}</p>;
  if (!v) return <div className="admin-page"><div className="card admin-skeleton" style={{ height: 200 }} /></div>;

  const puedeCancelar = !TERMINALES.has(v.estado);

  return (
    <div className="admin-page">
      <Link href="/admin/viajes" className="admin-back">← Viajes</Link>

      <div className="section-header admin-detail-header">
        <div>
          <h2>Viaje #{v.id_viaje}</h2>
          <p>
            <span className={`status ${v.estado}`}>{v.estado.replace(/_/g, " ")}</span>
            {" "}<span className={`zone-tag ${v.zona}`}>{v.zona}</span>
          </p>
        </div>
        <div>
          {puedeCancelar ? (
            <button className="btn admin-btn-danger" onClick={() => setConfirming(true)}>
              Cancelar viaje
            </button>
          ) : (
            <button className="btn" disabled>No cancelable ({v.estado})</button>
          )}
        </div>
      </div>

      {confirming && (
        <div className="card admin-cancel-box">
          <p className="admin-cancel-box__title">¿Cancelar este viaje?</p>
          <p className="admin-cancel-box__hint">
            Esta acción es irreversible y detiene el tracking. Podés dejar un motivo (opcional).
          </p>
          <input
            className="admin-input"
            placeholder="Motivo (opcional)"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
          {cancelError && <p className="admin-error">{cancelError}</p>}
          <div className="admin-cancel-box__actions">
            <button className="btn" onClick={() => setConfirming(false)} disabled={cancelling}>
              Volver
            </button>
            <button className="btn admin-btn-danger" onClick={handleCancelar} disabled={cancelling}>
              {cancelling ? "Cancelando…" : "Confirmar cancelación"}
            </button>
          </div>
        </div>
      )}

      <div className="grid-12">
        <div className="card span-4">
          <p className="metric__label">Precios</p>
          <dl className="admin-dl">
            <div><dt>Estimado</dt><dd>{formatARS(v.precio_estimado)}</dd></div>
            <div><dt>Real</dt><dd>{v.precio_real != null ? formatARS(v.precio_real) : "—"}</dd></div>
            <div><dt>Fee</dt><dd>{v.fee != null ? formatARS(v.fee) : "—"}</dd></div>
          </dl>
        </div>
        <div className="card span-4">
          <p className="metric__label">Cliente</p>
          {v.cliente ? (
            <dl className="admin-dl">
              <div><dt>Nombre</dt><dd>{v.cliente.usuario.nombre} {v.cliente.usuario.apellido}</dd></div>
              <div><dt>Email</dt><dd>{v.cliente.usuario.email}</dd></div>
            </dl>
          ) : <p className="admin-table__muted">—</p>}
        </div>
        <div className="card span-4">
          <p className="metric__label">Conductor</p>
          {v.conductor ? (
            <dl className="admin-dl">
              <div><dt>Nombre</dt><dd>{v.conductor.usuario.nombre} {v.conductor.usuario.apellido}</dd></div>
              <div><dt>Calificación</dt><dd>{v.conductor.calificacion_promedio ?? "—"}</dd></div>
              <div><dt>Vehículo</dt><dd>{v.vehiculo ? `${v.vehiculo.patente} · ${v.vehiculo.marca} ${v.vehiculo.modelo}` : "—"}</dd></div>
            </dl>
          ) : <p className="admin-table__muted">Sin asignar</p>}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <p className="metric__label">Paradas</p>
        <div className="admin-table" style={{ marginTop: 8 }}>
          <div className="admin-table__row admin-table__row--head admin-table__row--parada">
            <span>#</span><span>Dirección</span><span>Estado</span><span>Entrega</span>
          </div>
          {v.paradas.length > 0 ? v.paradas.map((p) => (
            <div key={p.orden} className="admin-table__row admin-table__row--parada">
              <span className="admin-table__strong">{p.orden}</span>
              <span>{p.direccion}</span>
              <span className="admin-table__muted">{p.estado}</span>
              <span className="admin-table__muted">{p.fecha_entrega ? fmtDateTime(p.fecha_entrega) : "—"}</span>
            </div>
          )) : <div className="admin-table__empty">Sin paradas registradas</div>}
        </div>
      </div>

      {(v.remito_url || v.calificacion || v.motivo_cancelacion) && (
        <div className="grid-12" style={{ marginTop: 16 }}>
          {v.remito_url && (
            <div className="card span-4">
              <p className="metric__label">Remito</p>
              <a href={v.remito_url} target="_blank" rel="noopener noreferrer" className="admin-link">Ver PDF →</a>
            </div>
          )}
          {v.calificacion && (
            <div className="card span-4">
              <p className="metric__label">Calificación</p>
              <p className="metric__value" style={{ fontSize: 22 }}>{v.calificacion.puntaje} ★</p>
              {v.calificacion.comentario && <p className="admin-table__muted">{v.calificacion.comentario}</p>}
            </div>
          )}
          {v.motivo_cancelacion && (
            <div className="card span-4">
              <p className="metric__label">Motivo de cancelación</p>
              <p>{v.motivo_cancelacion}</p>
              {v.cancelado_por_admin && (
                <p className="admin-table__muted">por {v.cancelado_por_admin.nombre} {v.cancelado_por_admin.apellido}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
