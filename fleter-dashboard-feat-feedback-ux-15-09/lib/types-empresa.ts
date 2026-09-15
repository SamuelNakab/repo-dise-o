import type { EstadoViaje, Zona } from "./types-admin";

export type { EstadoViaje, Zona };

export type Condicion =
  | "FRAGIL"
  | "REFRIGERADO"
  | "CARGA_PESADA"
  | "PELIGROSO"
  | "VOLUMINOSO";

export const CONDICIONES: Condicion[] = [
  "FRAGIL",
  "REFRIGERADO",
  "CARGA_PESADA",
  "PELIGROSO",
  "VOLUMINOSO",
];

export const CONDICION_LABEL: Record<Condicion, string> = {
  FRAGIL: "Frágil",
  REFRIGERADO: "Refrigerado",
  CARGA_PESADA: "Carga pesada",
  PELIGROSO: "Peligroso",
  VOLUMINOSO: "Voluminoso",
};

/** Estado de la afiliación de un conductor a una empresa. */
export type EstadoAfiliacion = "PENDIENTE" | "ACTIVO";

// ---- GET /api/empresas/mias ----

export interface Empresa {
  id_empresa: number;
  nombre: string;
  cuit: string;
  codigo_afiliacion: string;
  activa: boolean;
  _count?: {
    conductores: number;
    vehiculos: number;
    viajes: number;
  };
}

// ---- GET /api/empresas/:id ----

export interface EmpresaDetalle extends Empresa {
  /** Promedio de los conductores ACTIVOS que ya tienen alguna calificación. `null` si ninguno tiene. */
  calificacion_promedio: number | null;
  cantidad_conductores_activos: number;
}

// ---- GET /api/empresas/:id/conductores ----

export interface ConductorEmpresa {
  id_conductor: number;
  /** Id de la fila de afiliación (`conductor_empresa`), no siempre presente. */
  id_conductor_empresa?: number;
  estado: EstadoAfiliacion;
  calificacion_promedio: number | null;
  nro_licencia?: string;
  usuario: {
    nombre: string;
    apellido: string;
    email?: string;
    telefono?: string | null;
  };
}

// ---- GET /api/empresas/:id/vehiculos ----

export interface VehiculoFlota {
  id_vehiculo: number;
  id_empresa: number | null;
  id_conductor: number | null;
  patente: string;
  marca: string;
  modelo: string;
  anio: number;
  color: string;
  tipo_vehiculo: string;
  condiciones: { id_condicion?: number; id_vehiculo?: number; condicion: Condicion }[];
}

export interface NuevoVehiculo {
  patente: string;
  marca: string;
  modelo: string;
  anio: number;
  color: string;
  tipo_vehiculo: string;
  condiciones: Condicion[];
}

// ---- Paradas ----

export interface ParadaEmpresa {
  id_parada?: number;
  orden: number;
  direccion: string;
  latitud?: number;
  longitud?: number;
  estado?: "PENDIENTE" | "ENTREGADO";
  fecha_entrega?: string | null;
}

// ---- GET /api/empresas/:id/viajes ----

/**
 * Viajes de la empresa, del más nuevo al más viejo. Trae **todos** los que
 * tienen `id_empresa = :id`, es decir desde que un gerente reservó
 * (`RESERVADO_POR_EMPRESA`) en adelante, incluidos `FINALIZADO` y `CANCELADO`.
 *
 * El contrato documenta el JSON completo, así que estos campos ya no están
 * inferidos.
 */
export interface ViajeEmpresa {
  id_viaje: number;
  zona: Zona;
  estado: EstadoViaje;
  precio_estimado: number;
  /** Sólo tiene valor en `FINALIZADO`; `null` incluso en `CANCELADO`. */
  precio_real: number | null;
  fecha_programada: string;
  /**
   * Momento de la reserva; contra esto corre el timeout
   * (`RESERVA_TIMEOUT_MINUTOS`, default 10). Vuelve a `null` si la reserva se
   * libera, y se reinicia si el conductor cancela.
   */
  fecha_reserva: string | null;
  fecha_inicio: string | null;
  creado_en: string;
  descripcion: string | null;
  id_empresa: number | null;
  id_conductor: number | null;
  /** FK cruda; `vehiculo` es la misma relación expandida. Comparar por acá. */
  id_vehiculo: number | null;
  iniciado_por?: "CONDUCTOR" | "GERENTE" | null;
  motivo_cancelacion?: string | null;
  tarifa_hora?: number | null;
  tarifa_km?: number | null;
  /** Horas float. `null` hasta el cierre: se persisten al finalizar. */
  tiempo_capital?: number | null;
  distancia_provincia?: number | null;
  /** Horas float — este endpoint devuelve la fila cruda, no los minutos. */
  duracion_estimada_horas?: number | null;
  paradas: ParadaEmpresa[];
  condiciones_req: { condicion: Condicion }[];
  cliente: { usuario: { nombre: string; apellido: string; telefono?: string | null } } | null;
  conductor: {
    id_conductor: number;
    calificacion_promedio?: number | null;
    nro_licencia?: string;
    licencia_vencimiento?: string;
    usuario: { nombre: string; apellido: string; telefono?: string | null };
  } | null;
  vehiculo?: {
    id_vehiculo: number;
    id_empresa?: number | null;
    patente: string;
    marca: string;
    modelo: string;
    anio?: number;
    color?: string;
    tipo_vehiculo?: string;
    /** Expandido a propósito: es lo que filtra la flota sin pedirla aparte. */
    condiciones: { condicion: Condicion }[];
  } | null;
}

// ---- GET /api/viajes/:id (rol GERENTE de la empresa dueña del viaje) ----

/**
 * Sólo lo que el panel de gerente consume de ese endpoint. El resto del detalle
 * sigue saliendo de `GET /api/empresas/:id/viajes` (`ViajeEmpresa`), que es la
 * única fuente con `id_vehiculo` y `fecha_reserva`.
 */
export interface ViajeDetalleGerente {
  /** Puntos `[lng, lat]`. `null` si el viaje terminó o la ruta nunca se calculó. */
  ruta_planeada: [number, number][] | null;
  /** `null` si el viaje no es de ninguna empresa (conductor independiente). */
  empresa: { id_empresa: number; nombre: string; id_gerente: number } | null;
  /** Minutos enteros — distinto de `duracion_estimada_horas` de `ViajeEmpresa`. */
  duracion_estimada?: number | null;
  /** `null` mientras no haya conductor asignado. */
  vehiculo?: {
    id_vehiculo: number;
    patente: string;
    marca: string;
    modelo: string;
    tipo_vehiculo: string;
  } | null;
}

// ---- Viajes del mercado abierto ----

/**
 * Unión de las dos fuentes de viajes disponibles, que no traen lo mismo:
 * - `GET /api/empresas/:id/viajes-disponibles` (pull REST): trae todo, incluido
 *   `estado`, `cliente` y las paradas con coordenadas.
 * - Evento socket `viaje:disponible` (push): NO trae `estado` ni `cliente`, y sus
 *   paradas vienen sólo con `orden` y `direccion`.
 *
 * Por eso lo exclusivo del REST está marcado como opcional.
 */
export interface ViajeDisponibleGerente {
  id_viaje: number;
  zona: Zona;
  precio_estimado: number;
  fecha_programada: string;
  descripcion?: string | null;
  estado?: EstadoViaje;
  paradas: { orden: number; direccion: string; latitud?: number; longitud?: number }[];
  condiciones_req: { condicion: Condicion }[];
  cliente?: {
    usuario: { nombre: string; apellido: string; telefono?: string | null };
  } | null;
}

// ---- Respuestas de reserva y asignación ----

export interface ReservarResponse {
  id_viaje: number;
  estado: EstadoViaje;
  id_empresa: number;
  fecha_reserva?: string;
}

export interface AsignarResponse {
  id_viaje: number;
  estado: EstadoViaje;
  id_conductor: number;
  id_vehiculo: number;
}

export interface IniciarViajeResponse {
  mensaje: string;
  id_viaje: number;
  estado: EstadoViaje;
  fecha_inicio: string;
  puntualidad_inicio: "A_TIEMPO" | "TARDE" | "MUY_TARDE";
  iniciado_por: "CONDUCTOR" | "GERENTE";
}

/** Payload del evento `viaje:requiere_reasignacion` (room personal del gerente). */
export interface RequiereReasignacion {
  id_viaje: number;
  id_empresa: number;
  motivo: "conductor_desafiliado" | "conductor_cancelo";
}

/**
 * Un vehículo sirve para un viaje si cubre TODAS las condiciones requeridas.
 * Misma regla de elegibilidad que aplica el backend al asignar.
 */
export function vehiculoCumple(
  vehiculo: VehiculoFlota,
  requeridas: { condicion: Condicion }[] | undefined,
): boolean {
  if (!requeridas || requeridas.length === 0) return true;
  const tiene = new Set(vehiculo.condiciones.map((c) => c.condicion));
  return requeridas.every((r) => tiene.has(r.condicion));
}
