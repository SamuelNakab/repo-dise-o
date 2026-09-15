import { describe, it, expect } from "vitest";
import {
  formatDuracion,
  formatARS,
  fmtDate,
  fmtDateTime,
  fmtTime,
} from "@/lib/utils";

// Nota: la timezone se fija en vitest.config.ts (America/Argentina/Buenos_Aires,
// UTC-3 todo el año) para que el formateo de fechas sea determinista en CI.

describe("formatDuracion — duración de un viaje que ve el cliente", () => {
  it("muestra '—' cuando la duración es null (viaje sin datos de duración)", () => {
    expect(formatDuracion(null)).toBe("—");
  });

  it("muestra '—' cuando la duración es undefined", () => {
    expect(formatDuracion(undefined)).toBe("—");
  });

  it("muestra solo minutos cuando dura menos de una hora", () => {
    expect(formatDuracion(45)).toBe("45min");
  });

  it("muestra solo horas cuando es un múltiplo exacto de 60", () => {
    expect(formatDuracion(120)).toBe("2h");
  });

  it("muestra horas y minutos en el caso general", () => {
    expect(formatDuracion(95)).toBe("1h 35min");
  });
});

describe("formatARS — precios en pesos argentinos", () => {
  it("formatea con separador de miles es-AR (punto)", () => {
    expect(formatARS(1500)).toBe("$1.500");
  });

  it("formatea montos grandes con dos separadores de miles", () => {
    expect(formatARS(1234567)).toBe("$1.234.567");
  });

  it("formatea el cero sin separadores", () => {
    expect(formatARS(0)).toBe("$0");
  });
});

describe("fmtDate — fecha corta (día + mes) en el listado de viajes", () => {
  it("formatea una fecha ISO como día y mes abreviado", () => {
    // 15/03/2026 12:00 UTC → 09:00 en Buenos Aires (mismo día)
    const out = fmtDate("2026-03-15T12:00:00.000Z");
    expect(out).toContain("15");
    expect(out.toLowerCase()).toContain("mar");
  });
});

describe("fmtDateTime — fecha y hora en detalle de viaje", () => {
  it("incluye día, mes y hora de la fecha ISO", () => {
    // 15/03/2026 13:05 UTC → 10:05 en Buenos Aires
    const out = fmtDateTime("2026-03-15T13:05:00.000Z");
    expect(out).toContain("15");
    expect(out.toLowerCase()).toContain("mar");
    expect(out).toContain("10:05");
  });
});

describe("fmtTime — hora con formato a.m./p.m.", () => {
  it("formatea una hora de la mañana", () => {
    // 13:00 UTC → 10:00 en Buenos Aires
    expect(fmtTime("2026-03-15T13:00:00.000Z")).toBe("10:00 a.m.");
  });

  it("formatea una hora de la tarde", () => {
    // 20:15 UTC → 17:15 en Buenos Aires
    expect(fmtTime("2026-03-15T20:15:00.000Z")).toBe("5:15 p.m.");
  });
});
