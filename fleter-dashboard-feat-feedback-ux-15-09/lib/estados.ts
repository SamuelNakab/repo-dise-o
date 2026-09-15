import type { EstadoViaje } from "./types-admin";

/**
 * Etiqueta corta de cada estado del viaje, para badges `.status`.
 * Fuente única: hasta ahora este mapa estaba duplicado en cinco páginas y cada
 * copia se olvidaba de algún estado. La clase CSS del badge es el nombre crudo
 * del estado (ver `.status.<ESTADO>` en globals.css).
 */
export const ESTADO_LABEL: Record<EstadoViaje, string> = {
  BUSCANDO_CONDUCTOR: "BUSCANDO",
  RESERVADO_POR_EMPRESA: "RESERVADO",
  CONDUCTOR_ASIGNADO: "ASIGNADO",
  EN_CAMINO_A_ORIGEN: "EN CAMINO",
  CARGANDO: "CARGANDO",
  EN_RUTA: "EN RUTA",
  DESCARGANDO: "DESCARGANDO",
  FINALIZADO: "ENTREGADO",
  CANCELADO: "CANCELADO",
};

/**
 * Variante en gerundio, para el panel de viaje activo donde el estado se lee
 * como una acción en curso y no como una etiqueta.
 */
export const ESTADO_LABEL_ACTIVO: Record<EstadoViaje, string> = {
  BUSCANDO_CONDUCTOR: "Buscando fletero",
  RESERVADO_POR_EMPRESA: "Reservado por la empresa",
  CONDUCTOR_ASIGNADO: "Conductor asignado",
  EN_CAMINO_A_ORIGEN: "En camino al origen",
  CARGANDO: "Cargando",
  EN_RUTA: "En ruta",
  DESCARGANDO: "Descargando",
  FINALIZADO: "Entregado",
  CANCELADO: "Cancelado",
};

/** Estados en los que el viaje ya no admite transiciones. */
export const ESTADOS_TERMINALES: EstadoViaje[] = ["FINALIZADO", "CANCELADO"];

/** Estados en los que el viaje está físicamente en curso (hay GPS y tracking). */
export const ESTADOS_EN_CURSO: EstadoViaje[] = [
  "EN_CAMINO_A_ORIGEN",
  "CARGANDO",
  "EN_RUTA",
  "DESCARGANDO",
];

/**
 * Estados de un viaje que ya tiene quién lo haga pero todavía no arrancó. No
 * son "en curso": un viaje aceptado para el jueves no se sigue en vivo el lunes.
 */
export const ESTADOS_PROXIMOS: EstadoViaje[] = [
  "RESERVADO_POR_EMPRESA",
  "CONDUCTOR_ASIGNADO",
];

/** ¿El viaje está físicamente en curso? Única regla para banner, nav y tracking. */
export function esEnCurso(estado: string | null | undefined): boolean {
  return ESTADOS_EN_CURSO.includes(estado as EstadoViaje);
}

/** ¿El viaje está asignado o reservado pero todavía no se inició? */
export function esProximo(estado: string | null | undefined): boolean {
  return ESTADOS_PROXIMOS.includes(estado as EstadoViaje);
}

export function etiquetaEstado(estado: string): string {
  return ESTADO_LABEL[estado as EstadoViaje] ?? estado.replace(/_/g, " ");
}

/**
 * ¿El viaje terminó con entrega? El estado del VIAJE es `FINALIZADO`.
 * `ENTREGADO` es el estado de una PARADA — no confundirlos: durante un tiempo
 * el front comparó el viaje contra "ENTREGADO" y, como los fixtures MOCK lo
 * replicaban, el dashboard daba todo cero contra el backend real.
 */
export function esFinalizado(estado: string | null | undefined): boolean {
  return estado === "FINALIZADO";
}
