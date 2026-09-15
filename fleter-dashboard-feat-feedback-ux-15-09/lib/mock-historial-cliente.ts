import type { ViajeResumenInput, Zona } from "./analytics-cliente";

/**
 * Historial MOCK de una PyME, generado relativo a hoy con semilla fija: ~6 meses
 * de viajes con estados, zonas y puntualidad variados. Lo usan los BFF de
 * Analytics y Facturación en `NEXT_PUBLIC_MOCK=true`. Antes Analytics devolvía
 * KPIs fijos que no se movían al cambiar de período.
 */
export function mockHistorialCliente(ahora = Date.now()): ViajeResumenInput[] {
  let seed = 20260915;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const destinos: { dir: string; zona: Zona }[] = [
    { dir: "Av. Crovara 4250, La Tablada", zona: "PROVINCIA" },
    { dir: "Mercado Central, Tapiales", zona: "PROVINCIA" },
    { dir: "Dock Sud, Avellaneda", zona: "PROVINCIA" },
    { dir: "Av. Warnes 1840, CABA", zona: "CABA" },
    { dir: "Parque Industrial Pilar", zona: "MIXTO" },
    { dir: "Av. Corrientes 1234, CABA", zona: "CABA" },
  ];
  const out: ViajeResumenInput[] = [];
  for (let i = 0; i < 70; i++) {
    const diasAtras = Math.floor(rnd() * 180) - 3; // unos pocos a futuro
    const fecha = new Date(ahora - diasAtras * 86_400_000);
    fecha.setHours(7 + Math.floor(rnd() * 11), 0, 0, 0);
    const d = destinos[Math.floor(rnd() * destinos.length)];
    const futuro = diasAtras < 0;
    const r = rnd();
    const estado = futuro ? "CONDUCTOR_ASIGNADO" : r < 0.12 ? "CANCELADO" : "FINALIZADO";
    const base = d.zona === "CABA" ? 18000 : d.zona === "MIXTO" ? 42000 : 65000;
    out.push({
      id_viaje: 300 + i,
      estado,
      precio_real: estado === "FINALIZADO" ? Math.round((base * (0.7 + rnd() * 0.8)) / 100) * 100 : null,
      zona: d.zona,
      duracion_real: estado === "FINALIZADO" ? 35 + Math.floor(rnd() * 150) : null,
      puntualidad_inicio: estado === "FINALIZADO" ? (rnd() < 0.78 ? "A_TIEMPO" : rnd() < 0.7 ? "TARDE" : "MUY_TARDE") : null,
      fecha_programada: fecha.toISOString(),
      creado_en: fecha.toISOString(),
      paradas: [
        { orden: 1, direccion: "Av. Rivadavia 5200, Caballito, CABA" },
        { orden: 2, direccion: d.dir },
      ],
    });
  }
  return out;
}
