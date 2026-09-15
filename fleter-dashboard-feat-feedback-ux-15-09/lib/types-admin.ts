import type { Rol } from "./roles";

export type EstadoViaje =
  | "BUSCANDO_CONDUCTOR"
  | "RESERVADO_POR_EMPRESA"
  | "CONDUCTOR_ASIGNADO"
  | "EN_CAMINO_A_ORIGEN"
  | "CARGANDO"
  | "EN_RUTA"
  | "DESCARGANDO"
  | "FINALIZADO"
  | "CANCELADO";

export type Zona = "CABA" | "PROVINCIA" | "MIXTO";

export const ESTADOS_VIAJE: EstadoViaje[] = [
  "BUSCANDO_CONDUCTOR",
  "RESERVADO_POR_EMPRESA",
  "CONDUCTOR_ASIGNADO",
  "EN_CAMINO_A_ORIGEN",
  "CARGANDO",
  "EN_RUTA",
  "DESCARGANDO",
  "FINALIZADO",
  "CANCELADO",
];

export const ZONAS: Zona[] = ["CABA", "PROVINCIA", "MIXTO"];

export const ROLES: Rol[] = ["CLIENTE", "CONDUCTOR", "GERENTE", "ADMIN"];

// ---- GET /api/admin/estadisticas ----

export interface AdminEstadisticas {
  usuarios: {
    total: number;
    por_rol: Record<Rol, number>;
    registrados_ultimo_mes: number;
    registrados_por_dia_ultimos_30_dias: { fecha: string; cantidad: number }[];
  };
  viajes: {
    total: number;
    por_estado: Record<EstadoViaje, number>;
    por_dia_ultimos_30_dias: {
      fecha: string;
      cantidad_creados: number;
      cantidad_finalizados: number;
    }[];
  };
  plata: {
    total_precio_real_finalizados: number;
    total_fee_app: number;
    total_neto_conductores: number;
    top_conductores_por_ganancia: {
      id_conductor: number;
      nombre: string;
      apellido: string;
      total_ganado: number;
      cantidad_viajes: number;
    }[];
    top_clientes_por_gasto: {
      id_cliente: number;
      nombre: string;
      apellido: string;
      total_gastado: number;
      cantidad_viajes: number;
    }[];
  };
}

// ---- GET /api/admin/usuarios ----

export interface AdminUsuarioListItem {
  id_usuario: number;
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  telefono: string | null;
  rol: Rol;
  fecha_registro: string;
  cliente: unknown | null;
  conductor: unknown | null;
  empresas_gerente: unknown[];
}

export interface AdminUsuariosResponse {
  total: number;
  page: number;
  limit: number;
  usuarios: AdminUsuarioListItem[];
}

// ---- GET /api/admin/usuarios/:id ----

export interface AdminUsuarioDetalle {
  id_usuario: number;
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  telefono: string | null;
  rol: Rol;
  fecha_registro: string;
  cliente?: {
    id_cliente: number;
    cuit: string | null;
    nombre_empresa: string | null;
    direccion_principal: string | null;
    viajes?: { id_viaje: number; estado: EstadoViaje; precio_real: number | null; creado_en: string }[];
  } | null;
  conductor?: {
    id_conductor: number;
    nro_licencia: string;
    licencia_vencimiento: string;
    calificacion_promedio: number | null;
    vehiculos?: {
      id_vehiculo: number;
      patente: string;
      marca: string;
      modelo: string;
      anio: number;
      color: string;
      tipo_vehiculo: string;
      condiciones: { condicion: string }[];
    }[];
    viajes?: { id_viaje: number; estado: EstadoViaje; precio_real: number | null; creado_en: string }[];
  } | null;
  empresas?: {
    id_empresa: number;
    nombre: string;
    cuit: string;
  }[];
}

// ---- GET /api/admin/viajes ----

export interface AdminViajeListItem {
  id_viaje: number;
  zona: Zona;
  estado: EstadoViaje;
  precio_estimado: number;
  precio_real: number | null;
  fecha_programada: string;
  creado_en: string;
  cliente: { usuario: { nombre: string; apellido: string; email: string } } | null;
  conductor: { usuario: { nombre: string; apellido: string } } | null;
  _count: { paradas: number };
}

export interface AdminViajesResponse {
  total: number;
  page: number;
  limit: number;
  viajes: AdminViajeListItem[];
}

// ---- GET /api/admin/viajes/:id ----

export interface AdminViajeDetalle {
  id_viaje: number;
  zona: Zona;
  estado: EstadoViaje;
  precio_estimado: number;
  precio_real: number | null;
  fee: number | null;
  remito_url: string | null;
  motivo_cancelacion: string | null;
  cancelado_por_admin_id: number | null;
  cancelado_por_admin: { nombre: string; apellido: string } | null;
  fecha_programada: string;
  creado_en: string;
  paradas: {
    orden: number;
    direccion: string;
    estado: string;
    fecha_entrega: string | null;
  }[];
  condiciones_req: { condicion: string }[];
  cliente: { id_cliente: number; usuario: { nombre: string; apellido: string; email: string } } | null;
  conductor: { id_conductor: number; calificacion_promedio: number | null; usuario: { nombre: string; apellido: string } } | null;
  vehiculo: { id_vehiculo: number; patente: string; marca: string; modelo: string } | null;
  calificacion: { puntaje: number; comentario: string | null; fecha_hora: string } | null;
}

export interface CancelarViajeResponse {
  mensaje: string;
  id_viaje: number;
  estado: "CANCELADO";
  motivo: string | null;
}
