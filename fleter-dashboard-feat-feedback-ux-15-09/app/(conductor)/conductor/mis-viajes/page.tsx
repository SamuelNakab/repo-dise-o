"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, Radio, History } from "lucide-react";
import { api } from "@/lib/api";
import { esEnCurso, esProximo } from "@/lib/estados";
import TripCard, { type TripCardViaje } from "@/components/conductor/TripCard";

/** Forma de `GET /api/viajes/mis-viajes-conductor` (contrato). */
interface MiViaje extends TripCardViaje {
  estado: string;
  creado_en: string;
  paradas: { orden: number; direccion: string; estado?: string; fecha_entrega?: string | null }[];
  cliente: { usuario: { nombre: string; apellido: string; telefono?: string | null } };
}

/** Lo que el listado no trae y sí trae `GET /api/viajes/:id`. */
interface Extra {
  ruta_planeada: [number, number][] | null;
  duracion_estimada: number | null;
}

type Tab = "proximos" | "en_curso" | "historial";

const TABS: { key: Tab; label: string; Icon: typeof Radio }[] = [
  { key: "en_curso", label: "En curso", Icon: Radio },
  { key: "proximos", label: "Próximos", Icon: CalendarClock },
  { key: "historial", label: "Historial", Icon: History },
];

const VACIO: Record<Tab, { titulo: string; texto: string }> = {
  en_curso: { titulo: "Nada en curso", texto: "Cuando inicies un viaje desde la app lo vas a ver acá." },
  proximos: { titulo: "No tenés viajes por hacer", texto: "Los viajes que aceptes aparecen acá con fecha, hora, recorrido y tarifa." },
  historial: { titulo: "Todavía no hiciste viajes", texto: "Los viajes finalizados y cancelados quedan guardados acá." },
};

export default function MisViajesPage() {
  const [viajes, setViajes] = useState<MiViaje[]>([]);
  const [extras, setExtras] = useState<Record<number, Extra>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabElegida, setTabElegida] = useState<Tab | null>(null);

  useEffect(() => {
    api.get<MiViaje[]>("/api/viajes/mis-viajes-conductor")
      .then((data) => {
        setViajes(data);
        // Sólo para lo que falta hacer: son pocos y es donde importan km y duración.
        const pendientes = data.filter((v) => esProximo(v.estado) || esEnCurso(v.estado));
        return Promise.allSettled(
          pendientes.map((v) => api.get<Extra>(`/api/viajes/${v.id_viaje}`).then((d) => [v.id_viaje, d] as const)),
        );
      })
      .then((res) => {
        const mapa: Record<number, Extra> = {};
        for (const r of res) {
          if (r.status === "fulfilled") {
            const [id, d] = r.value;
            mapa[id] = { ruta_planeada: d.ruta_planeada ?? null, duracion_estimada: d.duracion_estimada ?? null };
          }
        }
        setExtras(mapa);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudieron cargar los viajes"))
      .finally(() => setLoading(false));
  }, []);

  const grupos = useMemo(() => {
    const porFecha = (a: MiViaje, b: MiViaje) => new Date(a.fecha_programada).getTime() - new Date(b.fecha_programada).getTime();
    return {
      en_curso: viajes.filter((v) => esEnCurso(v.estado)).sort(porFecha),
      proximos: viajes.filter((v) => esProximo(v.estado)).sort(porFecha),
      historial: viajes.filter((v) => !esEnCurso(v.estado) && !esProximo(v.estado)).sort((a, b) => porFecha(b, a)),
    };
  }, [viajes]);

  // Por defecto: lo que está pasando ahora; si no hay, lo que viene.
  const tab: Tab = tabElegida ?? (grupos.en_curso.length > 0 ? "en_curso" : "proximos");
  const lista = grupos[tab];

  return (
    <div className="page-wide">
      <div className="section-header">
        <div>
          <h2>Mis viajes</h2>
          <p>Los viajes que aceptaste: cuándo, por dónde y por cuánto</p>
        </div>
        <Link href="/conductor" className="btn">Buscar viajes disponibles</Link>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`tab${tab === key ? " is-active" : ""}`}
            onClick={() => setTabElegida(key)}
          >
            <Icon size={15} /> {label}
            {!loading && <span className="tab__count">{grupos[key].length}</span>}
          </button>
        ))}
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="trip-cards">
        {loading && Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="trip-card skeleton" />
        ))}

        {!loading && !error && lista.length === 0 && (
          <div className="empty-state">
            <p className="empty-state__title">{VACIO[tab].titulo}</p>
            <p className="empty-state__text">{VACIO[tab].texto}</p>
          </div>
        )}

        {!loading && lista.map((v) => (
          <TripCard
            key={v.id_viaje}
            viaje={v}
            href={`/conductor/viajes/${v.id_viaje}`}
            ruta={extras[v.id_viaje]?.ruta_planeada}
            duracionEstimada={extras[v.id_viaje]?.duracion_estimada}
            calcularKm={tab !== "historial"}
            mostrarEstado
          />
        ))}
      </div>
    </div>
  );
}
