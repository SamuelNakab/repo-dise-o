"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/utils";
import { ESTADOS_VIAJE, ZONAS, type AdminViajesResponse } from "@/lib/types-admin";
import type { EstadoViaje, Zona } from "@/lib/types-admin";
import { Pagination } from "@/components/admin/Pagination";

const LIMIT = 50;

export default function AdminViajesPage() {
  const [estado, setEstado] = useState<EstadoViaje | "">("");
  const [zona, setZona] = useState<Zona | "">("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AdminViajesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (estado) params.set("estado", estado);
    if (zona) params.set("zona", zona);
    if (desde) params.set("desde", desde);
    if (hasta) params.set("hasta", hasta);
    api.get<AdminViajesResponse>(`/api/admin/viajes?${params}`)
      .then((d) => { if (active) { setData(d); setError(null); } })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : "Error al cargar"); });
    return () => { active = false; };
  }, [estado, zona, desde, hasta, page]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  function reset<T>(setter: (v: T) => void, v: T) {
    setter(v);
    setPage(1);
  }

  return (
    <div className="admin-page">
      <div className="section-header">
        <h2>Viajes</h2>
        <p>{data ? `${data.total} viajes` : "Cargando…"}</p>
      </div>

      <div className="admin-filters">
        <label className="admin-filter">
          <span>Estado</span>
          <select value={estado} onChange={(e) => reset(setEstado, e.target.value as EstadoViaje | "")}>
            <option value="">Todos</option>
            {ESTADOS_VIAJE.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </select>
        </label>
        <label className="admin-filter">
          <span>Zona</span>
          <select value={zona} onChange={(e) => reset(setZona, e.target.value as Zona | "")}>
            <option value="">Todas</option>
            {ZONAS.map((z) => <option key={z} value={z}>{z}</option>)}
          </select>
        </label>
        <label className="admin-filter">
          <span>Desde</span>
          <input type="date" value={desde} onChange={(e) => reset(setDesde, e.target.value)} />
        </label>
        <label className="admin-filter">
          <span>Hasta</span>
          <input type="date" value={hasta} onChange={(e) => reset(setHasta, e.target.value)} />
        </label>
      </div>

      {error && <p className="admin-error">{error}</p>}

      <div className="admin-table">
        <div className="admin-table__row admin-table__row--head admin-table__row--viajes">
          <span>ID</span>
          <span>Cliente</span>
          <span>Conductor</span>
          <span>Zona</span>
          <span>Estado</span>
          <span>Precio</span>
          <span>Creado</span>
        </div>
        {!data && !error ? (
          [0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="admin-table__row admin-skeleton" style={{ height: 44 }} />
          ))
        ) : data && data.viajes.length > 0 ? (
          data.viajes.map((v) => (
            <Link key={v.id_viaje} href={`/admin/viajes/${v.id_viaje}`} className="admin-table__row admin-table__row--viajes admin-table__row--link">
              <span className="admin-table__strong">#{v.id_viaje}</span>
              <span className="admin-table__muted">{v.cliente ? `${v.cliente.usuario.nombre} ${v.cliente.usuario.apellido}` : "—"}</span>
              <span className="admin-table__muted">{v.conductor ? `${v.conductor.usuario.nombre} ${v.conductor.usuario.apellido}` : "—"}</span>
              <span><span className={`zone-tag ${v.zona}`}>{v.zona}</span></span>
              <span><span className={`status ${v.estado}`}>{v.estado.replace(/_/g, " ")}</span></span>
              <span className="admin-table__muted">{`$${(v.precio_real ?? v.precio_estimado).toLocaleString("es-AR")}`}</span>
              <span className="admin-table__muted">{fmtDate(v.creado_en)}</span>
            </Link>
          ))
        ) : (
          <div className="admin-table__empty">No hay viajes para estos filtros</div>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
