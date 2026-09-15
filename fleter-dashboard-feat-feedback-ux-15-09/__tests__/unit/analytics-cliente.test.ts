import { describe, it, expect } from "vitest";
import { calcularResumen, type ViajeResumenInput } from "@/lib/analytics-cliente";

const TZ_AR = 180; // getTimezoneOffset() en UTC-3

function viaje(p: Partial<ViajeResumenInput> & { id_viaje: number; fecha: string }): ViajeResumenInput {
  return {
    estado: "FINALIZADO",
    precio_real: 1000,
    zona: "CABA",
    fecha_programada: p.fecha,
    creado_en: p.fecha,
    paradas: [
      { orden: 1, direccion: "Origen 1, CABA" },
      { orden: 2, direccion: "Destino 1, CABA" },
    ],
    ...p,
  };
}

// Septiembre 2026 en hora de Argentina: 1/9 00:00 AR = 1/9 03:00 UTC.
const SEP_DESDE = new Date("2026-09-01T03:00:00.000Z");
const SEP_HASTA = new Date("2026-10-01T02:59:59.999Z");

describe("calcularResumen", () => {
  it("reparte los viajes del mes en semanas distintas (antes caían todos en una barra)", () => {
    const viajes = [
      viaje({ id_viaje: 1, fecha: "2026-09-02T15:00:00.000Z" }),
      viaje({ id_viaje: 2, fecha: "2026-09-10T15:00:00.000Z" }),
      viaje({ id_viaje: 3, fecha: "2026-09-11T15:00:00.000Z" }),
      viaje({ id_viaje: 4, fecha: "2026-09-25T15:00:00.000Z" }),
    ];
    const r = calcularResumen(viajes, { desde: SEP_DESDE, hasta: SEP_HASTA, vista: "mensual", tzOffsetMin: TZ_AR });

    expect(r.serie.map((b) => b.label)).toEqual(["1–7", "8–14", "15–21", "22–28", "29–30"]);
    expect(r.serie.map((b) => b.solicitados)).toEqual([1, 2, 0, 1, 0]);
    expect(r.serie.reduce((a, b) => a + b.solicitados, 0)).toBe(4);
  });

  it("usa la fecha del cliente, no la UTC del servidor", () => {
    // Lunes 7/9 a las 22:30 en Argentina = martes 8/9 01:30 UTC.
    const viajes = [viaje({ id_viaje: 1, fecha: "2026-09-08T01:30:00.000Z" })];
    const r = calcularResumen(viajes, { desde: SEP_DESDE, hasta: SEP_HASTA, vista: "mensual", tzOffsetMin: TZ_AR });
    expect(r.serie[0].solicitados).toBe(1); // semana 1–7
  });

  it("filtra por período aunque el backend devuelva todo el historial", () => {
    const viajes = [
      viaje({ id_viaje: 1, fecha: "2026-09-05T15:00:00.000Z", precio_real: 2000 }),
      viaje({ id_viaje: 2, fecha: "2026-08-20T15:00:00.000Z", precio_real: 5000 }),
    ];
    const r = calcularResumen(viajes, { desde: SEP_DESDE, hasta: SEP_HASTA, vista: "mensual", tzOffsetMin: TZ_AR });
    expect(r.cantidad_fletes).toBe(1);
    expect(r.total_gastado).toBe(2000);
    expect(r.periodo_anterior).toEqual({ total_gastado: 5000, cantidad_fletes: 1, costo_promedio: 5000 });
    expect(r.variacion.total_gastado).toBe(-60);
  });

  it("cancelados, puntualidad y gasto por zona", () => {
    const viajes = [
      viaje({ id_viaje: 1, fecha: "2026-09-02T15:00:00.000Z", zona: "PROVINCIA", precio_real: 3000, puntualidad_inicio: "A_TIEMPO", duracion_real: 60 }),
      viaje({ id_viaje: 2, fecha: "2026-09-03T15:00:00.000Z", zona: "CABA", precio_real: 1000, puntualidad_inicio: "TARDE", duracion_real: 30 }),
      viaje({ id_viaje: 3, fecha: "2026-09-04T15:00:00.000Z", estado: "CANCELADO", precio_real: null }),
      viaje({ id_viaje: 4, fecha: "2026-09-05T15:00:00.000Z", estado: "CANCELADO", precio_real: null }),
    ];
    const r = calcularResumen(viajes, { desde: SEP_DESDE, hasta: SEP_HASTA, vista: "mensual", tzOffsetMin: TZ_AR });

    expect(r.finalizados).toBe(2);
    expect(r.cancelados).toBe(2);
    expect(r.tasa_cancelacion).toBe(50);
    expect(r.puntualidad.porcentaje_a_tiempo).toBe(50);
    expect(r.duracion_promedio).toBe(45);
    expect(r.gasto_por_zona).toEqual({ CABA: 1000, PROVINCIA: 3000, MIXTO: 0 });
    expect(r.flete_mas_caro).toMatchObject({ id_viaje: 1, monto: 3000, origen: "Origen 1, CABA", destino: "Destino 1, CABA" });
    // El backend no manda alertas_count: la pantalla tiene que poder decir "sin dato".
    expect(r.alertas_disponible).toBe(false);
  });

  it("vista semanal: siete días de lunes a domingo", () => {
    const lunes = new Date("2026-09-14T03:00:00.000Z");
    const domingo = new Date("2026-09-21T02:59:59.999Z");
    const r = calcularResumen([], { desde: lunes, hasta: domingo, vista: "semanal", tzOffsetMin: TZ_AR });
    expect(r.serie.map((b) => b.label)).toEqual(["Lun 14", "Mar 15", "Mié 16", "Jue 17", "Vie 18", "Sáb 19", "Dom 20"]);
    expect(r.tasa_cancelacion).toBeNull();
    expect(r.variacion.total_gastado).toBeNull();
  });
});
