"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatARS } from "@/lib/utils";
import { BarChart, DistributionBars } from "@/components/admin/Charts";
import type { AdminEstadisticas } from "@/lib/types-admin";

const ESTADO_LABELS: Record<string, string> = {
  BUSCANDO_CONDUCTOR: "Buscando",
  RESERVADO_POR_EMPRESA: "Reservado",
  CONDUCTOR_ASIGNADO: "Asignado",
  EN_CAMINO_A_ORIGEN: "En camino",
  CARGANDO: "Cargando",
  EN_RUTA: "En ruta",
  DESCARGANDO: "Descargando",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
};

export default function AdminEstadisticasPage() {
  const [data, setData] = useState<AdminEstadisticas | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<AdminEstadisticas>("/api/admin/estadisticas")
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Error al cargar"));
  }, []);

  if (error) return <p className="admin-error">{error}</p>;
  if (!data) return <StatsSkeleton />;

  const { usuarios, viajes, plata } = data;

  return (
    <div className="admin-page">
      <div className="section-header">
        <h2>Estadísticas</h2>
        <p>Resumen general de la operación</p>
      </div>

      {/* KPIs */}
      <div className="grid-12">
        <div className="card span-3">
          <p className="metric__label">Usuarios</p>
          <p className="metric__value">{usuarios.total}</p>
          <p className="metric__hint">{usuarios.registrados_ultimo_mes} nuevos este mes</p>
        </div>
        <div className="card span-3">
          <p className="metric__label">Viajes</p>
          <p className="metric__value">{viajes.total}</p>
          <p className="metric__hint">{viajes.por_estado.FINALIZADO} finalizados</p>
        </div>
        <div className="card span-3">
          <p className="metric__label">Facturado (finalizados)</p>
          <p className="metric__value" style={{ fontSize: 26 }}>{formatARS(plata.total_precio_real_finalizados)}</p>
          <p className="metric__hint">Neto conductores {formatARS(plata.total_neto_conductores)}</p>
        </div>
        <div className="card card--ink span-3">
          <p className="metric__label">Fee de la app</p>
          <p className="metric__value" style={{ fontSize: 26 }}>{formatARS(plata.total_fee_app)}</p>
          <p className="metric__hint">Comisión sobre finalizados</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid-12" style={{ marginTop: 16 }}>
        <div className="card span-6">
          <p className="metric__label">Usuarios registrados (30 días)</p>
          <BarChart
            points={usuarios.registrados_por_dia_ultimos_30_dias.map((d) => ({ fecha: d.fecha, values: [d.cantidad] }))}
            series={[{ name: "Registros", colorVar: "var(--accent)" }]}
          />
        </div>
        <div className="card span-6">
          <p className="metric__label">Viajes por día (30 días)</p>
          <BarChart
            points={viajes.por_dia_ultimos_30_dias.map((d) => ({ fecha: d.fecha, values: [d.cantidad_creados, d.cantidad_finalizados] }))}
            series={[
              { name: "Creados", colorVar: "var(--info)" },
              { name: "Finalizados", colorVar: "var(--ok)" },
            ]}
          />
        </div>
      </div>

      {/* Distribuciones */}
      <div className="grid-12" style={{ marginTop: 16 }}>
        <div className="card span-6">
          <p className="metric__label">Viajes por estado</p>
          <div style={{ marginTop: 12 }}>
            <DistributionBars
              data={Object.entries(viajes.por_estado).map(([k, v]) => ({ label: ESTADO_LABELS[k] ?? k, value: v }))}
              colorVar="var(--accent)"
            />
          </div>
        </div>
        <div className="card span-6">
          <p className="metric__label">Usuarios por rol</p>
          <div style={{ marginTop: 12 }}>
            <DistributionBars
              data={Object.entries(usuarios.por_rol).map(([k, v]) => ({ label: k, value: v }))}
              colorVar="var(--info)"
            />
          </div>
        </div>
      </div>

      {/* Tops */}
      <div className="grid-12" style={{ marginTop: 16 }}>
        <div className="card span-6">
          <p className="metric__label">Top conductores por ganancia</p>
          <table className="admin-top-table">
            <tbody>
              {plata.top_conductores_por_ganancia.map((c) => (
                <tr key={c.id_conductor}>
                  <td>{c.nombre} {c.apellido}</td>
                  <td className="admin-top-table__meta">{c.cantidad_viajes} viajes</td>
                  <td className="admin-top-table__val">{formatARS(c.total_ganado)}</td>
                </tr>
              ))}
              {plata.top_conductores_por_ganancia.length === 0 && (
                <tr><td className="admin-top-table__meta">Sin datos</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="card span-6">
          <p className="metric__label">Top clientes por gasto</p>
          <table className="admin-top-table">
            <tbody>
              {plata.top_clientes_por_gasto.map((c) => (
                <tr key={c.id_cliente}>
                  <td>{c.nombre} {c.apellido}</td>
                  <td className="admin-top-table__meta">{c.cantidad_viajes} viajes</td>
                  <td className="admin-top-table__val">{formatARS(c.total_gastado)}</td>
                </tr>
              ))}
              {plata.top_clientes_por_gasto.length === 0 && (
                <tr><td className="admin-top-table__meta">Sin datos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="admin-page">
      <div className="section-header">
        <h2>Estadísticas</h2>
        <p>Cargando…</p>
      </div>
      <div className="grid-12">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card span-3 admin-skeleton" style={{ height: 92 }} />
        ))}
      </div>
      <div className="grid-12" style={{ marginTop: 16 }}>
        <div className="card span-6 admin-skeleton" style={{ height: 200 }} />
        <div className="card span-6 admin-skeleton" style={{ height: 200 }} />
      </div>
    </div>
  );
}
