import { describe, it, expect } from "vitest";
import { agruparComprobantes } from "@/lib/facturacion-cliente";
import type { ViajeResumenInput } from "@/lib/analytics-cliente";

function viaje(id: number, fecha: string, estado = "FINALIZADO", precio: number | null = 1000): ViajeResumenInput {
  return {
    id_viaje: id,
    estado,
    precio_real: precio,
    zona: "CABA",
    fecha_programada: fecha,
    creado_en: fecha,
    paradas: [
      { orden: 2, direccion: "Destino" },
      { orden: 1, direccion: "Origen" },
    ],
  };
}

describe("agruparComprobantes", () => {
  it("agrupa sólo finalizados con precio, por mes local, del más reciente al más viejo", () => {
    const meses = agruparComprobantes(
      [
        viaje(1, "2026-08-10T15:00:00.000Z", "FINALIZADO", 2000),
        viaje(2, "2026-09-02T15:00:00.000Z", "FINALIZADO", 3000),
        viaje(3, "2026-09-05T15:00:00.000Z", "CANCELADO", null),
        viaje(4, "2026-09-06T15:00:00.000Z", "FINALIZADO", 500),
        // 31/8 22:00 en Argentina = 1/9 01:00 UTC: es de agosto para el cliente.
        viaje(5, "2026-09-01T01:00:00.000Z", "FINALIZADO", 100),
      ],
      180,
    );

    expect(meses.map((m) => m.clave)).toEqual(["2026-09", "2026-08"]);
    expect(meses[0].total_informativo).toBe(3500);
    expect(meses[0].comprobantes.map((c) => c.id_viaje)).toEqual([4, 2]);
    expect(meses[1].total_informativo).toBe(2100);
    expect(meses[0].comprobantes[0]).toMatchObject({ origen: "Origen", destino: "Destino" });
  });
});
