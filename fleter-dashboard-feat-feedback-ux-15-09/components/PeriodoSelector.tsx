"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarRange } from "lucide-react";
import { usePeriodo, type PeriodoMode } from "@/hooks/usePeriodo";

function toInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function corto(d: Date, conAnio = false): string {
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short", ...(conAnio ? { year: "numeric" } : {}) });
}

export function etiquetaPeriodo(mode: PeriodoMode, desde: Date, hasta: Date): string {
  if (mode === "mensual") {
    // Sólo la inicial: `text-transform: capitalize` dejaba "Septiembre De 2026".
    const s = desde.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  if (mode === "todo") return "Todo el historial";
  return `${corto(desde)} – ${corto(hasta, true)}`;
}

/**
 * Selector de período único para Analytics y Record. Reemplaza a las tabs del
 * dashboard y a `SelectorPeriodo` (dos controles distintos para lo mismo).
 * Semana y mes se navegan con flechas; el rango se elige en un popover.
 */
export default function PeriodoSelector({ conTodo = false }: { conTodo?: boolean }) {
  const { periodo, setMensual, setSemanal, setTodo, setPersonalizado, shift, puedeAvanzar } = usePeriodo();
  const [abierto, setAbierto] = useState(false);
  const [borrador, setBorrador] = useState({ desde: toInputValue(periodo.desde), hasta: toInputValue(periodo.hasta) });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    function fuera(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, [abierto]);

  const modos: { key: PeriodoMode; label: string }[] = [
    { key: "semanal", label: "Semana" },
    { key: "mensual", label: "Mes" },
    { key: "personalizado", label: "Rango" },
    ...(conTodo ? [{ key: "todo" as PeriodoMode, label: "Todo" }] : []),
  ];

  function abrirRango() {
    setBorrador({ desde: toInputValue(periodo.desde), hasta: toInputValue(periodo.hasta) });
    setAbierto(true);
  }

  function elegirModo(key: PeriodoMode) {
    if (key === "mensual") setMensual();
    else if (key === "semanal") setSemanal();
    else if (key === "todo") setTodo();
    else abrirRango();
  }

  function aplicar(desde: Date, hasta: Date) {
    setPersonalizado(desde, hasta);
    setAbierto(false);
  }

  function atajo(dias: number) {
    const hasta = new Date();
    hasta.setHours(23, 59, 59, 999);
    const desde = new Date();
    desde.setDate(desde.getDate() - (dias - 1));
    desde.setHours(0, 0, 0, 0);
    aplicar(desde, hasta);
  }

  const hoy = toInputValue(new Date());
  const rangoValido = borrador.desde && borrador.hasta && borrador.desde <= borrador.hasta;

  return (
    <div className="periodo" ref={ref}>
      <div className="period-tabs" role="tablist" aria-label="Tipo de período">
        {modos.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={periodo.mode === key}
            className={`period-tab${periodo.mode === key ? " is-active" : ""}`}
            onClick={() => elegirModo(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {periodo.mode !== "todo" && (
        <div className="periodo__nav">
          <button type="button" className="periodo__arrow" onClick={() => shift(-1)} aria-label="Período anterior">
            <ChevronLeft size={16} />
          </button>
          {periodo.mode === "personalizado" ? (
            <button type="button" className="periodo__label" onClick={abrirRango} title="Cambiar rango">
              <CalendarRange size={13} />
              {etiquetaPeriodo(periodo.mode, periodo.desde, periodo.hasta)}
            </button>
          ) : (
            <span className="periodo__label">{etiquetaPeriodo(periodo.mode, periodo.desde, periodo.hasta)}</span>
          )}
          <button
            type="button"
            className="periodo__arrow"
            onClick={() => shift(1)}
            disabled={!puedeAvanzar}
            aria-label="Período siguiente"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {abierto && (
        <div className="periodo__popover" role="dialog" aria-label="Elegir rango">
          <div className="periodo__atajos">
            <button type="button" className="chip" onClick={() => atajo(7)}>Últimos 7 días</button>
            <button type="button" className="chip" onClick={() => atajo(30)}>Últimos 30 días</button>
            <button type="button" className="chip" onClick={() => atajo(90)}>Últimos 90 días</button>
          </div>
          <div className="periodo__popover-row">
            <div className="field">
              <label htmlFor="rango-desde">Desde</label>
              <input
                id="rango-desde"
                type="date"
                value={borrador.desde}
                max={borrador.hasta || hoy}
                onChange={(e) => setBorrador((b) => ({ ...b, desde: e.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="rango-hasta">Hasta</label>
              <input
                id="rango-hasta"
                type="date"
                value={borrador.hasta}
                min={borrador.desde}
                max={hoy}
                onChange={(e) => setBorrador((b) => ({ ...b, hasta: e.target.value }))}
              />
            </div>
          </div>
          <div className="form-actions form-actions--end">
            <button type="button" className="btn btn--ghost" onClick={() => setAbierto(false)}>Cancelar</button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!rangoValido}
              onClick={() => aplicar(new Date(`${borrador.desde}T00:00:00`), new Date(`${borrador.hasta}T23:59:59.999`))}
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
