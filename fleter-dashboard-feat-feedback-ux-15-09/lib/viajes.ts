/**
 * Helpers de presentación de viajes compartidos entre cliente y conductor.
 * Solo ordenan y formatean lo que manda el backend: no calculan precio.
 */

export interface ParadaBase {
  orden: number;
  direccion: string;
}

export function ordenarParadas<P extends ParadaBase>(paradas: P[]): P[] {
  return [...paradas].sort((a, b) => a.orden - b.orden);
}

export function origenYDestino<P extends ParadaBase>(paradas: P[]): { origen: P | null; destino: P | null } {
  const ordenadas = ordenarParadas(paradas);
  return {
    origen: ordenadas[0] ?? null,
    destino: ordenadas.length > 1 ? ordenadas[ordenadas.length - 1] : null,
  };
}

/**
 * Parte una dirección de Google Places ("Av. Corrientes 1234, C1043 CABA,
 * Argentina") en calle y localidad, para mostrarla en dos líneas en vez de un
 * renglón de 80 caracteres. Descarta el país.
 */
export function separarDireccion(direccion: string): { calle: string; localidad: string } {
  const partes = direccion
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p && p.toLowerCase() !== "argentina");
  if (partes.length <= 1) return { calle: partes[0] ?? direccion, localidad: "" };
  return { calle: partes[0], localidad: partes.slice(1).join(", ") };
}

/** "12,4 km" / "850 m" / "—". */
export function formatKm(km: number | null | undefined): string {
  if (km == null || Number.isNaN(km)) return "—";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toLocaleString("es-AR", { maximumFractionDigits: 1 })} km`;
}

/** "jueves 18 de septiembre" */
export function fmtDiaLargo(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
}

/** "14:30" en 24 h, que es como se lee una hora de carga. */
export function fmtHora24(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export const PUNTUALIDAD_LABEL: Record<string, string> = {
  A_TIEMPO: "A tiempo",
  TARDE: "Tarde",
  MUY_TARDE: "Muy tarde",
};
