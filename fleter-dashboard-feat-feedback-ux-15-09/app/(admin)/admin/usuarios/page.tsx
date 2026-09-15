"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/utils";
import { ROLES, type AdminUsuariosResponse } from "@/lib/types-admin";
import type { Rol } from "@/lib/roles";
import { Pagination } from "@/components/admin/Pagination";

const LIMIT = 50;

export default function AdminUsuariosPage() {
  const [rol, setRol] = useState<Rol | "">("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AdminUsuariosResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (rol) params.set("rol", rol);
    api.get<AdminUsuariosResponse>(`/api/admin/usuarios?${params}`)
      .then((d) => { if (active) { setData(d); setError(null); } })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : "Error al cargar"); });
    return () => { active = false; };
  }, [rol, page]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="admin-page">
      <div className="section-header">
        <h2>Usuarios</h2>
        <p>{data ? `${data.total} usuarios` : "Cargando…"}</p>
      </div>

      <div className="admin-filters">
        <label className="admin-filter">
          <span>Rol</span>
          <select
            value={rol}
            onChange={(e) => { setRol(e.target.value as Rol | ""); setPage(1); }}
          >
            <option value="">Todos</option>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
      </div>

      {error && <p className="admin-error">{error}</p>}

      <div className="admin-table">
        <div className="admin-table__row admin-table__row--head">
          <span>Nombre</span>
          <span>Email</span>
          <span>DNI</span>
          <span>Rol</span>
          <span>Registro</span>
        </div>
        {!data && !error ? (
          [0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="admin-table__row admin-skeleton" style={{ height: 44 }} />
          ))
        ) : data && data.usuarios.length > 0 ? (
          data.usuarios.map((u) => (
            <Link key={u.id_usuario} href={`/admin/usuarios/${u.id_usuario}`} className="admin-table__row admin-table__row--link">
              <span className="admin-table__strong">{u.nombre} {u.apellido}</span>
              <span className="admin-table__muted">{u.email}</span>
              <span className="admin-table__muted">{u.dni}</span>
              <span><span className={`admin-rol admin-rol--${u.rol}`}>{u.rol}</span></span>
              <span className="admin-table__muted">{fmtDate(u.fecha_registro)}</span>
            </Link>
          ))
        ) : (
          <div className="admin-table__empty">No hay usuarios para este filtro</div>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
