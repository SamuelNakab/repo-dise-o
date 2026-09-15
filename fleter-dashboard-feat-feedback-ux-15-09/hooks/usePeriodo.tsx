"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type PeriodoMode = "mensual" | "semanal" | "todo" | "personalizado";

interface Periodo {
  mode: PeriodoMode;
  desde: Date;
  hasta: Date;
}

interface PeriodoContextValue {
  periodo: Periodo;
  setMensual: () => void;
  setSemanal: () => void;
  setTodo: () => void;
  setPersonalizado: (desde: Date, hasta: Date) => void;
  /** Mueve el período una unidad para atrás (-1) o adelante (+1). */
  shift: (dir: -1 | 1) => void;
  /** `false` si el período ya incluye hoy: no hay datos del futuro que mirar. */
  puedeAvanzar: boolean;
  queryParams: { desde: string; hasta: string } | Record<never, never>;
}

const DIA_MS = 24 * 60 * 60 * 1000;

function inicioMes(ref: Date): Date {
  return new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0, 0);
}

function finMes(ref: Date): Date {
  return new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
}

function inicioSemana(ref: Date): Date {
  const day = ref.getDay(); // 0=dom
  const diff = day === 0 ? -6 : 1 - day; // lunes
  const lunes = new Date(ref);
  lunes.setDate(ref.getDate() + diff);
  lunes.setHours(0, 0, 0, 0);
  return lunes;
}

function finSemana(ref: Date): Date {
  const fin = new Date(inicioSemana(ref));
  fin.setDate(fin.getDate() + 6);
  fin.setHours(23, 59, 59, 999);
  return fin;
}

const PeriodoContext = createContext<PeriodoContextValue | null>(null);

export function PeriodoProvider({ children }: { children: ReactNode }) {
  const [periodo, setPeriodo] = useState<Periodo>(() => {
    const hoy = new Date();
    return { mode: "mensual", desde: inicioMes(hoy), hasta: finMes(hoy) };
  });

  const setMensual = useCallback(() => {
    const hoy = new Date();
    setPeriodo({ mode: "mensual", desde: inicioMes(hoy), hasta: finMes(hoy) });
  }, []);

  const setSemanal = useCallback(() => {
    const hoy = new Date();
    setPeriodo({ mode: "semanal", desde: inicioSemana(hoy), hasta: finSemana(hoy) });
  }, []);

  const setTodo = useCallback(() => setPeriodo({ mode: "todo", desde: new Date(0), hasta: new Date() }), []);

  const setPersonalizado = useCallback(
    (desde: Date, hasta: Date) => setPeriodo({ mode: "personalizado", desde, hasta }),
    [],
  );

  const shift = useCallback((dir: -1 | 1) => {
    setPeriodo((p) => {
      if (p.mode === "mensual") {
        const ref = new Date(p.desde.getFullYear(), p.desde.getMonth() + dir, 1);
        return { mode: "mensual", desde: inicioMes(ref), hasta: finMes(ref) };
      }
      if (p.mode === "semanal") {
        const ref = new Date(p.desde);
        ref.setDate(ref.getDate() + 7 * dir);
        return { mode: "semanal", desde: inicioSemana(ref), hasta: finSemana(ref) };
      }
      if (p.mode === "personalizado") {
        // Se corre un tramo de la misma cantidad de días, pegado al actual.
        const dias = Math.round((p.hasta.getTime() - p.desde.getTime()) / DIA_MS);
        const desde = new Date(p.desde);
        desde.setDate(desde.getDate() + (dias + 1) * dir);
        const hasta = new Date(p.hasta);
        hasta.setDate(hasta.getDate() + (dias + 1) * dir);
        return { mode: "personalizado", desde, hasta };
      }
      return p;
    });
  }, []);

  // "Ahora" fijado al montar: leer el reloj en cada render rompe la pureza.
  const [ahora] = useState(() => Date.now());
  const puedeAvanzar = periodo.mode !== "todo" && periodo.hasta.getTime() < ahora;

  const queryParams = useMemo<PeriodoContextValue["queryParams"]>(() => {
    if (periodo.mode === "todo") return {};
    return {
      desde: periodo.desde.toISOString(),
      hasta: periodo.hasta.toISOString(),
    };
  }, [periodo]);

  return (
    <PeriodoContext.Provider
      value={{ periodo, setMensual, setSemanal, setTodo, setPersonalizado, shift, puedeAvanzar, queryParams }}
    >
      {children}
    </PeriodoContext.Provider>
  );
}

export function usePeriodo(): PeriodoContextValue {
  const ctx = useContext(PeriodoContext);
  if (!ctx) throw new Error("usePeriodo must be used inside PeriodoProvider");
  return ctx;
}
