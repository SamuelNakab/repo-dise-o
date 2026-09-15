import { esFinalizado } from "./estados";

/**
 * Cálculo del resumen de Analytics de la PyME. Corre en el BFF
 * (`app/api/analytics/cliente/resumen/route.ts`), nunca en el browser.
 *
 * Alcance autorizado el 15-09 (`OPEN.md` → D6): **cálculo de pantalla**. Nada de
 * lo que sale de acá es un número con valor comercial — la liquidación y la
 * factura, cuando existan, las calcula el backend.
 *
 * Es un módulo puro (sin fetch ni Next) para poder testearlo:
 * `__tests__/unit/analytics-cliente.test.ts`.
 */

export type Zona = "CABA" | "PROVINCIA" | "MIXTO";
export type Vista = "semanal" | "mensual" | "personalizado" | "todo";

export interface ViajeResumenInput {
  id_viaje: number;
  estado: string;
  precio_real: number | null;
  zona: Zona;
  alertas_count?: number;
  duracion_real?: number | null;
  puntualidad_inicio?: "A_TIEMPO" | "TARDE" | "MUY_TARDE" | null;
  fecha_programada: string | null;
  creado_en: string;
  paradas: { orden: number; direccion: string }[];
}

export interface Bucket {
  label: string;
  desde: string;
  hasta: string;
  solicitados: number;
  finalizados: number;
  gasto: number;
}

export interface Extremo {
  id_viaje: number;
  monto: number;
  origen: string | null;
  destino: string | null;
}

export interface ResumenCliente {
  vista: Vista;
  total_gastado: number;
  cantidad_fletes: number;
  finalizados: number;
  cancelados: number;
  /** % entero de cancelados sobre solicitados. `null` sin viajes. */
  tasa_cancelacion: number | null;
  costo_promedio: number | null;
  /** Minutos. Promedio de `duracion_real` de los finalizados que la tienen. */
  duracion_promedio: number | null;
  puntualidad: {
    a_tiempo: number;
    tarde: number;
    muy_tarde: number;
    medidos: number;
    porcentaje_a_tiempo: number | null;
  };
  por_zona: Record<Zona, number>;
  gasto_por_zona: Record<Zona, number>;
  flete_mas_caro: Extremo | null;
  flete_mas_barato: Extremo | null;
  alertas_count: number;
  /** `false` si el backend no manda `alertas_count` (hoy no lo manda: pedido D). */
  alertas_disponible: boolean;
  top_destinos: { direccion: string; count: number; zona: Zona }[];
  periodo_anterior: { total_gastado: number; cantidad_fletes: number; costo_promedio: number | null } | null;
  /** Variación % entera contra el período anterior. `null` si no hay base para comparar. */
  variacion: { total_gastado: number | null; cantidad_fletes: number | null; costo_promedio: number | null };
  serie: Bucket[];
}

const DIA = 24 * 60 * 60 * 1000;
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function fechaViaje(v: ViajeResumenInput): number {
  return new Date(v.fecha_programada ?? v.creado_en).getTime();
}

/**
 * Fecha "de pared" del cliente. El BFF corre en UTC (Vercel) y el cliente en
 * UTC-3: sin esto, un viaje del lunes a las 22 h caía en el martes.
 * `tzOffsetMin` es `Date#getTimezoneOffset()` del browser (180 en Argentina).
 */
function local(ts: number, tzOffsetMin: number): Date {
  return new Date(ts - tzOffsetMin * 60_000);
}

function inicioMesLocal(y: number, m: number, tzOffsetMin: number): number {
  return Date.UTC(y, m, 1) + tzOffsetMin * 60_000;
}

function metricas(viajes: ViajeResumenInput[]) {
  const finalizados = viajes.filter((v) => esFinalizado(v.estado) && v.precio_real != null);
  const total_gastado = finalizados.reduce((acc, v) => acc + (v.precio_real ?? 0), 0);
  return {
    finalizadosConPrecio: finalizados,
    total_gastado,
    cantidad_fletes: viajes.length,
    costo_promedio: finalizados.length > 0 ? Math.round(total_gastado / finalizados.length) : null,
  };
}

function variacion(actual: number | null, anterior: number | null | undefined): number | null {
  if (actual == null || anterior == null || anterior === 0) return null;
  return Math.round(((actual - anterior) / anterior) * 100);
}

function extremo(v: ViajeResumenInput | undefined): Extremo | null {
  if (!v || v.precio_real == null) return null;
  const orden = [...v.paradas].sort((a, b) => a.orden - b.orden);
  return {
    id_viaje: v.id_viaje,
    monto: v.precio_real,
    origen: orden[0]?.direccion ?? null,
    destino: orden.length > 1 ? orden[orden.length - 1].direccion : null,
  };
}

function periodoAnterior(desde: number, hasta: number, vista: Vista, tz: number): [number, number] {
  if (vista === "mensual") {
    const d = local(desde, tz);
    return [inicioMesLocal(d.getUTCFullYear(), d.getUTCMonth() - 1, tz), desde - 1];
  }
  if (vista === "semanal") return [desde - 7 * DIA, desde - 1];
  const largo = hasta - desde;
  return [desde - largo - 1, desde - 1];
}

function tramos(desde: number, hasta: number, vista: Vista, tz: number): { desde: number; hasta: number; label: string }[] {
  const out: { desde: number; hasta: number; label: string }[] = [];
  const dias = Math.ceil((hasta - desde + 1) / DIA);

  const porDia = (fmt: (d: Date) => string) => {
    for (let i = 0; i < dias; i++) {
      const a = desde + i * DIA;
      out.push({ desde: a, hasta: Math.min(a + DIA - 1, hasta), label: fmt(local(a, tz)) });
    }
  };
  const porSemana = (fmt: (a: Date, b: Date) => string) => {
    for (let a = desde; a <= hasta; a += 7 * DIA) {
      const b = Math.min(a + 7 * DIA - 1, hasta);
      out.push({ desde: a, hasta: b, label: fmt(local(a, tz), local(b, tz)) });
    }
  };
  const porMes = () => {
    const d = local(desde, tz);
    let y = d.getUTCFullYear();
    let m = d.getUTCMonth();
    for (let a = inicioMesLocal(y, m, tz); a <= hasta; a = inicioMesLocal(y, m, tz)) {
      const b = inicioMesLocal(y, m + 1, tz) - 1;
      out.push({ desde: Math.max(a, desde), hasta: Math.min(b, hasta), label: `${MESES[m]}${m === 0 ? ` ${String(y).slice(2)}` : ""}` });
      m++;
      if (m === 12) { m = 0; y++; }
    }
  };

  if (vista === "semanal") porDia((d) => `${DIAS[d.getUTCDay()]} ${d.getUTCDate()}`);
  else if (vista === "mensual") porSemana((a, b) => `${a.getUTCDate()}–${b.getUTCDate()}`);
  else if (dias <= 14) porDia((d) => `${d.getUTCDate()}/${d.getUTCMonth() + 1}`);
  else if (dias <= 92) porSemana((a) => `${a.getUTCDate()}/${a.getUTCMonth() + 1}`);
  else porMes();
  return out;
}

export function calcularResumen(
  todos: ViajeResumenInput[],
  opts: { desde: Date | null; hasta: Date | null; vista: Vista; tzOffsetMin: number; ahora?: Date },
): ResumenCliente {
  const tz = opts.tzOffsetMin;
  const ahora = (opts.ahora ?? new Date()).getTime();

  // `todo`: desde el viaje más viejo (tope 12 meses para que el gráfico se lea) hasta hoy.
  let desde = opts.desde?.getTime() ?? null;
  let hasta = opts.hasta?.getTime() ?? null;
  const vista = opts.vista;
  const enRango = (v: ViajeResumenInput, a: number | null, b: number | null) => {
    const f = fechaViaje(v);
    return (a == null || f >= a) && (b == null || f <= b);
  };

  // El backend no documenta filtros por fecha en `mis-viajes`: se filtra acá
  // siempre, aunque el backend los respete.
  const viajes = todos.filter((v) => enRango(v, desde, hasta));
  const m = metricas(viajes);

  const cancelados = viajes.filter((v) => v.estado === "CANCELADO").length;
  const duraciones = m.finalizadosConPrecio.map((v) => v.duracion_real).filter((d): d is number => d != null);
  const conPuntualidad = viajes.filter((v) => v.puntualidad_inicio != null);
  const aTiempo = conPuntualidad.filter((v) => v.puntualidad_inicio === "A_TIEMPO").length;

  const por_zona: Record<Zona, number> = { CABA: 0, PROVINCIA: 0, MIXTO: 0 };
  const gasto_por_zona: Record<Zona, number> = { CABA: 0, PROVINCIA: 0, MIXTO: 0 };
  for (const v of viajes) {
    if (v.zona in por_zona) por_zona[v.zona]++;
  }
  for (const v of m.finalizadosConPrecio) {
    if (v.zona in gasto_por_zona) gasto_por_zona[v.zona] += v.precio_real ?? 0;
  }

  const porPrecio = [...m.finalizadosConPrecio].sort((a, b) => (b.precio_real ?? 0) - (a.precio_real ?? 0));

  const destinos: Record<string, { count: number; zona: Zona }> = {};
  for (const v of viajes) {
    if (!v.paradas.length) continue;
    const ultimo = v.paradas.reduce((max, p) => (p.orden > max.orden ? p : max), v.paradas[0]);
    destinos[ultimo.direccion] ??= { count: 0, zona: v.zona };
    destinos[ultimo.direccion].count++;
  }
  const top_destinos = Object.entries(destinos)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 5)
    .map(([direccion, { count, zona }]) => ({ direccion, count, zona }));

  let periodo_anterior: ResumenCliente["periodo_anterior"] = null;
  if (vista !== "todo" && desde != null && hasta != null) {
    const [pa, pb] = periodoAnterior(desde, hasta, vista, tz);
    const prev = metricas(todos.filter((v) => enRango(v, pa, pb)));
    periodo_anterior = { total_gastado: prev.total_gastado, cantidad_fletes: prev.cantidad_fletes, costo_promedio: prev.costo_promedio };
  }

  if (vista === "todo") {
    const masViejo = todos.reduce((min, v) => Math.min(min, fechaViaje(v)), ahora);
    const d = local(ahora, tz);
    desde = Math.max(masViejo, inicioMesLocal(d.getUTCFullYear(), d.getUTCMonth() - 11, tz));
    hasta = ahora;
  }

  const serie: Bucket[] = desde != null && hasta != null
    ? tramos(desde, hasta, vista, tz).map((t) => {
        const enTramo = viajes.filter((v) => enRango(v, t.desde, t.hasta));
        const mt = metricas(enTramo);
        return {
          label: t.label,
          desde: new Date(t.desde).toISOString(),
          hasta: new Date(t.hasta).toISOString(),
          solicitados: enTramo.length,
          finalizados: mt.finalizadosConPrecio.length,
          gasto: mt.total_gastado,
        };
      })
    : [];

  return {
    vista,
    total_gastado: m.total_gastado,
    cantidad_fletes: m.cantidad_fletes,
    finalizados: m.finalizadosConPrecio.length,
    cancelados,
    tasa_cancelacion: viajes.length > 0 ? Math.round((cancelados / viajes.length) * 100) : null,
    costo_promedio: m.costo_promedio,
    duracion_promedio: duraciones.length > 0 ? Math.round(duraciones.reduce((a, b) => a + b, 0) / duraciones.length) : null,
    puntualidad: {
      a_tiempo: aTiempo,
      tarde: conPuntualidad.filter((v) => v.puntualidad_inicio === "TARDE").length,
      muy_tarde: conPuntualidad.filter((v) => v.puntualidad_inicio === "MUY_TARDE").length,
      medidos: conPuntualidad.length,
      porcentaje_a_tiempo: conPuntualidad.length > 0 ? Math.round((aTiempo / conPuntualidad.length) * 100) : null,
    },
    por_zona,
    gasto_por_zona,
    flete_mas_caro: extremo(porPrecio[0]),
    flete_mas_barato: extremo(porPrecio.at(-1)),
    alertas_count: viajes.reduce((acc, v) => acc + (v.alertas_count ?? 0), 0),
    alertas_disponible: viajes.some((v) => v.alertas_count !== undefined),
    top_destinos,
    periodo_anterior,
    variacion: {
      total_gastado: variacion(m.total_gastado, periodo_anterior?.total_gastado),
      cantidad_fletes: variacion(m.cantidad_fletes, periodo_anterior?.cantidad_fletes),
      costo_promedio: variacion(m.costo_promedio, periodo_anterior?.costo_promedio),
    },
    serie,
  };
}
