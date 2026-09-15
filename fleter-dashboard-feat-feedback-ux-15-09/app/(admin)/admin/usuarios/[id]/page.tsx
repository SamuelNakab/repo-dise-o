"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/utils";
import type { AdminUsuarioDetalle } from "@/lib/types-admin";

export default function AdminUsuarioDetallePage() {
  const { id } = useParams<{ id: string }>();
  const [u, setU] = useState<AdminUsuarioDetalle | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<AdminUsuarioDetalle>(`/api/admin/usuarios/${id}`)
      .then((d) => { setU(d); setError(null); })
      .catch((e) => setError(e instanceof Error ? e.message : "Error al cargar"));
  }, [id]);

  if (error) return <p className="admin-error">{error}</p>;
  if (!u) return <div className="admin-page"><div className="card admin-skeleton" style={{ height: 160 }} /></div>;

  return (
    <div className="admin-page">
      <Link href="/admin/usuarios" className="admin-back">← Usuarios</Link>

      <div className="section-header">
        <h2>{u.nombre} {u.apellido}</h2>
        <p><span className={`admin-rol admin-rol--${u.rol}`}>{u.rol}</span></p>
      </div>

      <div className="grid-12">
        <div className="card span-6">
          <p className="metric__label">Datos personales</p>
          <dl className="admin-dl">
            <div><dt>Email</dt><dd>{u.email}</dd></div>
            <div><dt>DNI</dt><dd>{u.dni}</dd></div>
            <div><dt>Teléfono</dt><dd>{u.telefono ?? "—"}</dd></div>
            <div><dt>Registro</dt><dd>{fmtDate(u.fecha_registro)}</dd></div>
          </dl>
        </div>

        {u.rol === "CLIENTE" && u.cliente && (
          <div className="card span-6">
            <p className="metric__label">Cliente</p>
            <dl className="admin-dl">
              <div><dt>Empresa</dt><dd>{u.cliente.nombre_empresa ?? "—"}</dd></div>
              <div><dt>CUIT</dt><dd>{u.cliente.cuit ?? "—"}</dd></div>
              <div><dt>Dirección</dt><dd>{u.cliente.direccion_principal ?? "—"}</dd></div>
            </dl>
          </div>
        )}

        {u.rol === "CONDUCTOR" && u.conductor && (
          <div className="card span-6">
            <p className="metric__label">Conductor</p>
            <dl className="admin-dl">
              <div><dt>Licencia</dt><dd>{u.conductor.nro_licencia}</dd></div>
              <div><dt>Vence</dt><dd>{fmtDate(u.conductor.licencia_vencimiento)}</dd></div>
              <div><dt>Calificación</dt><dd>{u.conductor.calificacion_promedio ?? "—"}</dd></div>
            </dl>
          </div>
        )}

        {u.rol === "GERENTE" && u.empresas && u.empresas.length > 0 && (
          <div className="card span-6">
            <p className="metric__label">Empresas</p>
            <ul className="admin-list">
              {u.empresas.map((e) => (
                <li key={e.id_empresa}>{e.nombre} <span className="admin-table__muted">· {e.cuit}</span></li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Vehículos del conductor */}
      {u.rol === "CONDUCTOR" && u.conductor?.vehiculos && u.conductor.vehiculos.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <p className="metric__label">Vehículos</p>
          <div className="admin-table" style={{ marginTop: 8 }}>
            <div className="admin-table__row admin-table__row--head admin-table__row--veh">
              <span>Patente</span><span>Marca / Modelo</span><span>Tipo</span><span>Condiciones</span>
            </div>
            {u.conductor.vehiculos.map((v) => (
              <div key={v.id_vehiculo} className="admin-table__row admin-table__row--veh">
                <span className="admin-table__strong">{v.patente}</span>
                <span className="admin-table__muted">{v.marca} {v.modelo}</span>
                <span className="admin-table__muted">{v.tipo_vehiculo}</span>
                <span className="admin-table__muted">{v.condiciones.map((c) => c.condicion).join(", ") || "—"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historial de viajes */}
      {(() => {
        const viajes = u.cliente?.viajes ?? u.conductor?.viajes;
        if (!viajes || viajes.length === 0) return null;
        return (
          <div className="card" style={{ marginTop: 16 }}>
            <p className="metric__label">Historial de viajes</p>
            <div className="admin-table" style={{ marginTop: 8 }}>
              <div className="admin-table__row admin-table__row--head admin-table__row--viaje">
                <span>ID</span><span>Estado</span><span>Precio real</span><span>Creado</span>
              </div>
              {viajes.map((v) => (
                <Link key={v.id_viaje} href={`/admin/viajes/${v.id_viaje}`} className="admin-table__row admin-table__row--viaje admin-table__row--link">
                  <span className="admin-table__strong">#{v.id_viaje}</span>
                  <span><span className={`status ${v.estado}`}>{v.estado.replace(/_/g, " ")}</span></span>
                  <span className="admin-table__muted">{v.precio_real != null ? `$${v.precio_real.toLocaleString("es-AR")}` : "—"}</span>
                  <span className="admin-table__muted">{fmtDate(v.creado_en)}</span>
                </Link>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
