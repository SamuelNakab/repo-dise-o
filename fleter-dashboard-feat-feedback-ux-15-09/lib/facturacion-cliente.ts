import { esFinalizado } from "./estados";
import type { ViajeResumenInput, Zona } from "./analytics-cliente";

/**
 * Comprobantes por mes para la pantalla de Facturación de la PyME. Corre en el
 * BFF (`app/api/facturacion/cliente/route.ts`).
 *
 * `total_informativo` es **cálculo de pantalla** (autorizado el 15-09,
 * `OPEN.md` → D6): una suma de precios finales para orientarse. **No es una
 * liquidación ni una factura** — eso depende de D3 (ABIERTA) y, cuando exista,
 * lo calcula el backend.
 */

export interface Comprobante {
  id_viaje: number;
  fecha: string;
  zona: Zona;
  origen: string | null;
  destino: string | null;
  precio_real: number;
}

export interface MesComprobantes {
  /** "2026-09" */
  clave: string;
  anio: number;
  /** 0-11 */
  mes: number;
  total_informativo: number;
  comprobantes: Comprobante[];
}

export function agruparComprobantes(viajes: ViajeResumenInput[], tzOffsetMin: number): MesComprobantes[] {
  const meses = new Map<string, MesComprobantes>();

  for (const v of viajes) {
    if (!esFinalizado(v.estado) || v.precio_real == null) continue;
    const fecha = v.fecha_programada ?? v.creado_en;
    // Mes de pared del cliente, no del servidor en UTC.
    const local = new Date(new Date(fecha).getTime() - tzOffsetMin * 60_000);
    const anio = local.getUTCFullYear();
    const mes = local.getUTCMonth();
    const clave = `${anio}-${String(mes + 1).padStart(2, "0")}`;
    const orden = [...v.paradas].sort((a, b) => a.orden - b.orden);

    if (!meses.has(clave)) meses.set(clave, { clave, anio, mes, total_informativo: 0, comprobantes: [] });
    const grupo = meses.get(clave)!;
    grupo.total_informativo += v.precio_real;
    grupo.comprobantes.push({
      id_viaje: v.id_viaje,
      fecha,
      zona: v.zona,
      origen: orden[0]?.direccion ?? null,
      destino: orden.length > 1 ? orden[orden.length - 1].direccion : null,
      precio_real: v.precio_real,
    });
  }

  return [...meses.values()]
    .sort((a, b) => b.clave.localeCompare(a.clave))
    .map((g) => ({
      ...g,
      comprobantes: g.comprobantes.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()),
    }));
}
