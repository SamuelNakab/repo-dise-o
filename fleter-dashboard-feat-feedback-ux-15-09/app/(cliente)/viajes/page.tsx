"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { usePeriodo } from "@/hooks/usePeriodo";
import PeriodoSelector from "@/components/PeriodoSelector";
import { formatARS, fmtDate, fmtTime, formatDuracion } from "@/lib/utils";
import { ESTADO_LABEL as ESTADO_LABEL_BASE, esFinalizado } from "@/lib/estados";

const ESTADO_LABEL: Record<string, string> = {
  ...ESTADO_LABEL_BASE,
  // El cliente ve el estado de la parada además del estado del viaje.
  ENTREGADO: "ENTREGADO",
  FINALIZADO: "FINALIZADO",
  // Asignado o reservado pero sin arrancar: es un viaje próximo, no uno en curso.
  RESERVADO_POR_EMPRESA: "PRÓXIMO",
  CONDUCTOR_ASIGNADO: "PRÓXIMO",
};

const ESTADO_CSS: Record<string, string> = {
  ENTREGADO: "ENTREGADO",
  FINALIZADO: "ENTREGADO",
  CANCELADO: "CANCELADO",
  BUSCANDO_CONDUCTOR: "BUSCANDO_FLETERO",
  RESERVADO_POR_EMPRESA: "CONDUCTOR_ASIGNADO",
  CONDUCTOR_ASIGNADO: "CONDUCTOR_ASIGNADO",
  EN_CAMINO_A_ORIGEN: "EN_RUTA",
  CARGANDO: "EN_RUTA",
  EN_RUTA: "EN_RUTA",
  DESCARGANDO: "EN_RUTA",
};

type SortKey = "fecha" | "precio_real" | "duracion_real";
type FilterKey = "TODOS" | "ENTREGADO" | "CANCELADO" | "CON_ALERTAS";

interface Parada { orden: number; direccion: string; }

interface MisViajesItem {
  id_viaje: number;
  zona: "CABA" | "PROVINCIA" | "MIXTO";
  precio_estimado: number;
  precio_real: number | null;
  estado: string;
  fecha_programada: string;
  creado_en: string;
  duracion_real?: number | null;
  alertas_count?: number;
  paradas: Parada[];
  conductor: { usuario: { nombre: string; apellido: string } } | null;
}

const PAGE_SIZE = 7;

const FILTER_CHIPS: { key: FilterKey; label: string }[] = [
  { key: "TODOS",       label: "Todos" },
  { key: "ENTREGADO",   label: "Entregados" },
  { key: "CANCELADO",   label: "Cancelados" },
  { key: "CON_ALERTAS", label: "Con alertas" },
];

const COLS: { label: string; sortable?: SortKey }[] = [
  { label: "Fecha",    sortable: "fecha" },
  { label: "Ruta" },
  { label: "ID" },
  { label: "Zona" },
  { label: "Estado" },
  { label: "Duración", sortable: "duracion_real" },
  { label: "Precio",   sortable: "precio_real" },
  { label: "!" },
  { label: "" },
];

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: "asc" | "desc" }) {
  const active = col === sortKey;
  return (
    <span className={`trip-row__sort-icon${active ? " trip-row__sort-icon--active" : ""}`}>
      {active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
    </span>
  );
}

export default function ViajesPage() {
  const router = useRouter();
  const { periodo } = usePeriodo();

  const [rawViajes, setRawViajes] = useState<MisViajesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("fecha");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("TODOS");

  async function fetchViajes() {
    try {
      const data = await api.get<MisViajesItem[]>("/api/viajes/mis-viajes");
      setRawViajes(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar los viajes");
    } finally {
      setLoading(false);
    }
  }

  // loading arranca en true desde el useState inicial (fetch de montaje).
  // setState solo en callbacks async (.then/.catch/.finally), nunca sincrónico.
  useEffect(() => {
    api.get<MisViajesItem[]>("/api/viajes/mis-viajes")
      .then(setRawViajes)
      .catch((e) => setError(e instanceof Error ? e.message : "Error al cargar los viajes"))
      .finally(() => setLoading(false));
  }, []);

  // Reset a la primera página cuando cambia el período/orden/filtro/búsqueda.
  // Patrón de React "adjusting state during render" en vez de un useEffect.
  const resetKey = JSON.stringify(periodo) + `|${sortKey}|${sortDir}|${filter}|${search}`;
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    setPage(1);
  }

  const filtered = useMemo(() => {
    let items = rawViajes;
    if (periodo.mode !== "todo") {
      items = items.filter((v) => {
        const d = new Date(v.fecha_programada ?? v.creado_en);
        return d >= periodo.desde && d <= periodo.hasta;
      });
    }
    if (filter === "ENTREGADO") items = items.filter((v) => esFinalizado(v.estado));
    else if (filter === "CANCELADO") items = items.filter((v) => v.estado === "CANCELADO");
    else if (filter === "CON_ALERTAS") items = items.filter((v) => (v.alertas_count ?? 0) > 0);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((v) => {
        const origen = v.paradas.find((p) => p.orden === 1)?.direccion ?? "";
        const destino = v.paradas.reduce((max, p) => (p.orden > max.orden ? p : max), v.paradas[0])?.direccion ?? "";
        return (
          origen.toLowerCase().includes(q) ||
          destino.toLowerCase().includes(q) ||
          `vj-${v.id_viaje}`.includes(q.replace("vj-", "").replace("vj", ""))
        );
      });
    }
    return items;
  }, [rawViajes, periodo, filter, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let va: number | null = null, vb: number | null = null;
      if (sortKey === "fecha") {
        va = new Date(a.fecha_programada ?? a.creado_en).getTime();
        vb = new Date(b.fecha_programada ?? b.creado_en).getTime();
      } else if (sortKey === "precio_real") {
        va = a.precio_real ?? a.precio_estimado;
        vb = b.precio_real ?? b.precio_estimado;
      } else if (sortKey === "duracion_real") {
        va = a.duracion_real ?? null;
        vb = b.duracion_real ?? null;
      }
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      return sortDir === "asc" ? va - vb : vb - va;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  return (
    <div>
      <div className="section-header">
        <div>
          <h2>Record</h2>
          <p>
            {!loading && !error
              ? `${filtered.length} ${filtered.length === 1 ? "viaje" : "viajes"} en el período`
              : "Historial completo de fletes solicitados."}
          </p>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <PeriodoSelector conTodo />
      </div>

      {/* Toolbar: search + filter chips */}
      <div className="toolbar">
        <div className="search-input">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            placeholder="Buscar por dirección o ID de viaje…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {FILTER_CHIPS.map((c) => (
          <button
            key={c.key}
            className={`chip${filter === c.key ? " is-active" : ""}`}
            onClick={() => setFilter(c.key)}
            type="button"
          >
            {c.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="error-banner error-banner--row">
          <span>{error}</span>
          <button className="btn" onClick={() => { setLoading(true); setError(null); fetchViajes(); }} type="button">Reintentar</button>
        </div>
      )}

      <div className="trips-table">
        {/* Header */}
        <div className="trip-row trip-row--header">
          {COLS.map((col, i) => (
            <div
              key={i}
              className={`trip-row__header-cell${col.sortable ? " trip-row__header-cell--sortable" : ""}`}
              onClick={col.sortable ? () => handleSort(col.sortable!) : undefined}
            >
              {col.label}
              {col.sortable && <SortIcon col={col.sortable} sortKey={sortKey} sortDir={sortDir} />}
            </div>
          ))}
        </div>

        {/* Loading */}
        {loading && Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton-row">
            {Array.from({ length: 9 }).map((_, j) => <div key={j} className="skeleton-cell" />)}
          </div>
        ))}

        {/* Empty */}
        {!loading && !error && filtered.length === 0 && (
          <div className="trips-empty">Sin viajes que coincidan con los filtros.</div>
        )}

        {/* Rows */}
        {!loading && pageItems.map((v) => {
          const origen = v.paradas.find((p) => p.orden === 1)?.direccion ?? "—";
          const destino = v.paradas.reduce((max, p) => (p.orden > max.orden ? p : max), v.paradas[0])?.direccion ?? "—";
          const isoStr = v.fecha_programada ?? v.creado_en;
          const estadoCss = ESTADO_CSS[v.estado] ?? v.estado;
          const estadoLabel = ESTADO_LABEL[v.estado] ?? v.estado;

          return (
            <div key={v.id_viaje} className="trip-row" onClick={() => router.push(`/viajes/${v.id_viaje}`)}>
              <div>
                <div className="trip-row__date">{fmtDate(isoStr)}<small>{fmtTime(isoStr)}</small></div>
              </div>
              <div className="trip-row__route">
                <div className="trip-row__route-origin">{origen}</div>
                <div className="trip-row__route-dest">{destino}</div>
              </div>
              <div className="trip-row__id">VJ-{v.id_viaje}</div>
              <span className={`zone-tag ${v.zona}`}>{v.zona}</span>
              <span className={`status ${estadoCss}`}>{estadoLabel}</span>
              <span className={`trip-row__dur${v.duracion_real ? "" : " trip-row__dur--null"}`}>
                {formatDuracion(v.duracion_real)}
              </span>
              <span className={`trip-row__price${v.precio_real == null ? " trip-row__price--null" : ""}`}>
                {v.precio_real != null ? formatARS(v.precio_real) : esFinalizado(v.estado) ? "—" : formatARS(v.precio_estimado)}
              </span>
              <span>
                {(v.alertas_count ?? 0) > 0
                  ? <span className="trip-row__alert-badge">{v.alertas_count}</span>
                  : null}
              </span>
              <span className="trip-row__chevron">›</span>
            </div>
          );
        })}
      </div>

      {/* Paginación */}
      {!loading && totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination__page"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            type="button"
          >
            ←
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              className={`pagination__page${n === page ? " is-active" : ""}`}
              onClick={() => setPage(n)}
              type="button"
            >
              {n}
            </button>
          ))}
          <button
            className="pagination__page"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            type="button"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
