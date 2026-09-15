import type {
  ConductorEmpresa,
  Empresa,
  EmpresaDetalle,
  VehiculoFlota,
  ViajeDisponibleGerente,
  ViajeEmpresa,
} from "./types-empresa";

/**
 * Fixtures MOCK del área de gerente (/api/empresas/* y reserva/asignación).
 *
 * A diferencia de los fixtures estáticos de `lib/api.ts`, esto mantiene estado
 * en memoria durante la sesión: reservar un viaje lo mueve a la lista de la
 * empresa, asignarlo le pone conductor y vehículo, etc. Sin eso el flujo del
 * gerente no se puede recorrer end-to-end con NEXT_PUBLIC_MOCK=true.
 */

const empresas: Empresa[] = [
  {
    id_empresa: 1,
    nombre: "Fletes del Sur SRL",
    cuit: "30712345678",
    codigo_afiliacion: "SUR-4F2A9",
    activa: true,
    _count: { conductores: 3, vehiculos: 2, viajes: 2 },
  },
];

const conductores: ConductorEmpresa[] = [
  {
    id_conductor: 4,
    id_conductor_empresa: 11,
    estado: "ACTIVO",
    calificacion_promedio: 4.8,
    nro_licencia: "B1234567",
    usuario: { nombre: "Carlos", apellido: "López", telefono: "+5491187654321" },
  },
  {
    id_conductor: 5,
    id_conductor_empresa: 12,
    estado: "ACTIVO",
    calificacion_promedio: null,
    nro_licencia: "B7654321",
    usuario: { nombre: "Marta", apellido: "Ríos", telefono: "+5491133344455" },
  },
  {
    id_conductor: 6,
    id_conductor_empresa: 13,
    estado: "PENDIENTE",
    calificacion_promedio: 4.2,
    nro_licencia: "B9998887",
    usuario: { nombre: "Diego", apellido: "Sosa", telefono: "+5491199988877" },
  },
];

const vehiculos: VehiculoFlota[] = [
  {
    id_vehiculo: 20,
    id_empresa: 1,
    id_conductor: null,
    patente: "FLT001",
    marca: "Ford",
    modelo: "Transit",
    anio: 2021,
    color: "Blanco",
    tipo_vehiculo: "furgon",
    condiciones: [{ id_condicion: 1, id_vehiculo: 20, condicion: "FRAGIL" }],
  },
  {
    id_vehiculo: 21,
    id_empresa: 1,
    id_conductor: null,
    patente: "FLT002",
    marca: "Iveco",
    modelo: "Daily",
    anio: 2019,
    color: "Gris",
    tipo_vehiculo: "camion",
    condiciones: [],
  },
];

const viajes: ViajeEmpresa[] = [
  {
    id_viaje: 501,
    zona: "CABA",
    estado: "CONDUCTOR_ASIGNADO",
    precio_estimado: 4200,
    precio_real: null,
    fecha_programada: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    fecha_reserva: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    fecha_inicio: null,
    creado_en: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    descripcion: null,
    id_empresa: 1,
    id_conductor: 4,
    id_vehiculo: 20,
    tarifa_hora: 5000,
    tarifa_km: null,
    duracion_estimada_horas: 0.75,
    paradas: [
      { id_parada: 1, orden: 1, direccion: "Av. Corrientes 1200, CABA", estado: "PENDIENTE", fecha_entrega: null },
      { id_parada: 2, orden: 2, direccion: "Palermo, CABA", estado: "PENDIENTE", fecha_entrega: null },
    ],
    condiciones_req: [{ condicion: "FRAGIL" }],
    cliente: { usuario: { nombre: "Juan", apellido: "Pérez", telefono: "+5491112345678" } },
    conductor: {
      id_conductor: 4,
      calificacion_promedio: 4.8,
      usuario: { nombre: "Carlos", apellido: "López", telefono: "+5491187654321" },
    },
    vehiculo: {
      id_vehiculo: 20,
      patente: "FLT001",
      marca: "Ford",
      modelo: "Transit",
      anio: 2020,
      color: "Blanco",
      tipo_vehiculo: "furgon",
      condiciones: [{ condicion: "FRAGIL" }],
    },
  },
  {
    // Viaje en curso: es el único estado en que aparece la card de costo
    // acumulado (`ESTADOS_EN_CURSO`), así que hace falta uno para probarla.
    id_viaje: 495,
    zona: "CABA",
    estado: "EN_RUTA",
    precio_estimado: 5200,
    precio_real: null,
    fecha_programada: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    fecha_reserva: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    fecha_inicio: new Date(Date.now() - 80 * 60 * 1000).toISOString(),
    creado_en: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    descripcion: null,
    id_empresa: 1,
    id_conductor: 4,
    id_vehiculo: 20,
    tarifa_hora: 5000,
    tarifa_km: null,
    duracion_estimada_horas: 1.2,
    paradas: [
      { id_parada: 5, orden: 1, direccion: "Retiro, CABA", estado: "ENTREGADO", fecha_entrega: new Date(Date.now() - 40 * 60 * 1000).toISOString() },
      { id_parada: 6, orden: 2, direccion: "Caballito, CABA", estado: "PENDIENTE", fecha_entrega: null },
    ],
    condiciones_req: [],
    cliente: { usuario: { nombre: "Lucía", apellido: "Fernández", telefono: "+5491155544433" } },
    conductor: {
      id_conductor: 4,
      calificacion_promedio: 4.8,
      usuario: { nombre: "Carlos", apellido: "López", telefono: "+5491187654321" },
    },
    vehiculo: {
      id_vehiculo: 20,
      patente: "FLT001",
      marca: "Ford",
      modelo: "Transit",
      anio: 2020,
      color: "Blanco",
      tipo_vehiculo: "furgon",
      condiciones: [{ condicion: "FRAGIL" }],
    },
  },
  {
    id_viaje: 490,
    zona: "PROVINCIA",
    estado: "FINALIZADO",
    precio_estimado: 9000,
    precio_real: 8650,
    fecha_programada: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    fecha_reserva: new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString(),
    fecha_inicio: new Date(Date.now() - 47 * 60 * 60 * 1000).toISOString(),
    creado_en: new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString(),
    descripcion: "Pallets de repuestos",
    id_empresa: 1,
    id_conductor: 4,
    id_vehiculo: 21,
    tarifa_hora: null,
    tarifa_km: 200,
    tiempo_capital: null,
    distancia_provincia: 43.25,
    duracion_estimada_horas: 1.5,
    paradas: [
      { id_parada: 3, orden: 1, direccion: "Microcentro, CABA", estado: "ENTREGADO", fecha_entrega: new Date(Date.now() - 46 * 60 * 60 * 1000).toISOString() },
      { id_parada: 4, orden: 2, direccion: "La Plata, Buenos Aires", estado: "ENTREGADO", fecha_entrega: new Date(Date.now() - 45 * 60 * 60 * 1000).toISOString() },
    ],
    condiciones_req: [],
    cliente: { usuario: { nombre: "María", apellido: "García", telefono: "+5491187654321" } },
    conductor: {
      id_conductor: 4,
      calificacion_promedio: 4.8,
      usuario: { nombre: "Carlos", apellido: "López", telefono: "+5491187654321" },
    },
    vehiculo: {
      id_vehiculo: 21,
      patente: "FLT002",
      marca: "Iveco",
      modelo: "Daily",
      anio: 2021,
      color: "Gris",
      tipo_vehiculo: "camion",
      condiciones: [],
    },
  },
];

/**
 * Mercado abierto: `GET /api/empresas/:id/viajes-disponibles`. Son viajes en
 * BUSCANDO_CONDUCTOR que todavía no reservó nadie, así que no tienen `id_empresa`
 * y no aparecen en `/api/empresas/:id/viajes`. Reservar uno lo saca de acá.
 *
 * VJ-601 pide FRAGIL a propósito: es el caso que hace visible el filtrado de la
 * flota al asignar (sólo el FLT001 cumple).
 */
let disponibles: ViajeDisponibleGerente[] = [
  {
    id_viaje: 601,
    zona: "CABA",
    estado: "BUSCANDO_CONDUCTOR",
    precio_estimado: 5400,
    fecha_programada: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
    descripcion: "Mudanza de oficina, hay ascensor de carga",
    paradas: [
      { orden: 1, direccion: "Av. Santa Fe 3200, CABA", latitud: -34.5875, longitud: -58.4105 },
      { orden: 2, direccion: "Villa Crespo, CABA", latitud: -34.5987, longitud: -58.4405 },
    ],
    condiciones_req: [{ condicion: "FRAGIL" }],
    cliente: { usuario: { nombre: "Lucía", apellido: "Ferrari", telefono: "+5491144455566" } },
  },
  {
    id_viaje: 602,
    zona: "PROVINCIA",
    estado: "BUSCANDO_CONDUCTOR",
    precio_estimado: 11200,
    fecha_programada: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
    descripcion: null,
    paradas: [
      { orden: 1, direccion: "Barracas, CABA", latitud: -34.6455, longitud: -58.3818 },
      { orden: 2, direccion: "Quilmes, Buenos Aires", latitud: -34.7203, longitud: -58.2543 },
    ],
    condiciones_req: [],
    cliente: { usuario: { nombre: "Pedro", apellido: "Nuñez", telefono: "+5491166677788" } },
  },
];

let nextEmpresaId = 2;
let nextVehiculoId = 22;

function codigoAleatorio(): string {
  return `EMP-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function buscarViaje(id: number): ViajeEmpresa | undefined {
  return viajes.find((v) => v.id_viaje === id);
}

/**
 * Crea la entrada de un viaje recién reservado desde la pantalla de
 * disponibles, que en MOCK se genera al vuelo y no está en `viajes`.
 */
function viajeReservado(id: number, idEmpresa: number): ViajeEmpresa {
  // Si el viaje venía del mercado abierto se conservan sus datos reales
  // (condiciones y paradas), que es lo que después filtra la flota al asignar.
  const origen = disponibles.find((v) => v.id_viaje === id);
  return {
    id_viaje: id,
    zona: origen?.zona ?? "CABA",
    estado: "RESERVADO_POR_EMPRESA",
    precio_estimado: origen?.precio_estimado ?? 3500,
    precio_real: null,
    fecha_programada:
      origen?.fecha_programada ?? new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    fecha_reserva: new Date().toISOString(),
    fecha_inicio: null,
    creado_en: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    descripcion: origen?.descripcion ?? null,
    id_empresa: idEmpresa,
    id_conductor: null,
    id_vehiculo: null,
    paradas: (origen?.paradas ?? [
      { orden: 1, direccion: "Plaza de Mayo, CABA" },
      { orden: 2, direccion: "Recoleta, CABA" },
    ]).map((p, i) => ({
      id_parada: id * 10 + i,
      orden: p.orden,
      direccion: p.direccion,
      estado: "PENDIENTE" as const,
      fecha_entrega: null,
    })),
    condiciones_req: origen?.condiciones_req ?? [],
    cliente: origen?.cliente ?? {
      usuario: { nombre: "Ana", apellido: "Suárez", telefono: "+5491100011122" },
    },
    conductor: null,
    vehiculo: null,
  };
}

/**
 * Resuelve las respuestas MOCK del área de gerente. Devuelve `undefined` si el
 * path no le corresponde, para que `apiFetch` siga con el resto de los mocks.
 */
export function gerenteMock(
  path: string,
  method: string,
  body: unknown,
): unknown | undefined {
  const [rawPath] = path.split("?");

  // ---- /api/empresas ----

  if (rawPath === "/api/empresas/mias" && method === "GET") return empresas;

  if (rawPath === "/api/empresas" && method === "POST") {
    const b = body as { nombre: string; cuit: string };
    const nueva: Empresa = {
      id_empresa: nextEmpresaId++,
      nombre: b.nombre,
      cuit: b.cuit,
      codigo_afiliacion: codigoAleatorio(),
      activa: true,
      _count: { conductores: 0, vehiculos: 0, viajes: 0 },
    };
    empresas.push(nueva);
    return nueva;
  }

  const regenerar = rawPath.match(/^\/api\/empresas\/(\d+)\/regenerar-codigo$/);
  if (regenerar && method === "POST") {
    const id = Number(regenerar[1]);
    const empresa = empresas.find((e) => e.id_empresa === id);
    if (!empresa) throw new Error("Empresa no encontrada");
    empresa.codigo_afiliacion = codigoAleatorio();
    return { id_empresa: id, codigo_afiliacion: empresa.codigo_afiliacion };
  }

  const conductorAprobar = rawPath.match(/^\/api\/empresas\/(\d+)\/conductores\/(\d+)\/aprobar$/);
  if (conductorAprobar && method === "POST") {
    const c = conductores.find((x) => x.id_conductor === Number(conductorAprobar[2]));
    if (!c) throw new Error("No hay una solicitud de afiliacion para ese conductor");
    if (c.estado === "ACTIVO") throw new Error("El conductor ya esta activo");
    c.estado = "ACTIVO";
    return c;
  }

  const conductorBaja = rawPath.match(/^\/api\/empresas\/(\d+)\/conductores\/(\d+)$/);
  if (conductorBaja && method === "DELETE") {
    const idc = Number(conductorBaja[2]);
    const enCurso = viajes.some(
      (v) => v.id_conductor === idc && ["EN_CAMINO_A_ORIGEN", "CARGANDO", "EN_RUTA", "DESCARGANDO"].includes(v.estado),
    );
    if (enCurso) throw new Error("El conductor tiene un viaje en curso");
    const i = conductores.findIndex((x) => x.id_conductor === idc);
    if (i === -1) throw new Error("Conductor no encontrado");
    conductores.splice(i, 1);
    return { mensaje: "Conductor desafiliado" };
  }

  const conductoresList = rawPath.match(/^\/api\/empresas\/(\d+)\/conductores$/);
  if (conductoresList && method === "GET") return conductores;

  const vehiculoBaja = rawPath.match(/^\/api\/empresas\/(\d+)\/vehiculos\/(\d+)$/);
  if (vehiculoBaja && method === "DELETE") {
    const idv = Number(vehiculoBaja[2]);
    const enUso = viajes.some(
      (v) => v.id_vehiculo === idv && !["FINALIZADO", "CANCELADO"].includes(v.estado),
    );
    if (enUso) throw new Error("No se puede eliminar un vehiculo en uso");
    const i = vehiculos.findIndex((x) => x.id_vehiculo === idv);
    if (i === -1) throw new Error("Vehiculo no encontrado");
    vehiculos.splice(i, 1);
    return { mensaje: "Vehiculo eliminado" };
  }

  const vehiculosPath = rawPath.match(/^\/api\/empresas\/(\d+)\/vehiculos$/);
  if (vehiculosPath) {
    const idEmpresa = Number(vehiculosPath[1]);
    if (method === "GET") return vehiculos;
    if (method === "POST") {
      const b = body as {
        patente: string; marca: string; modelo: string;
        anio: number; color: string; tipo_vehiculo: string;
        condiciones?: string[];
      };
      if (vehiculos.some((v) => v.patente.toUpperCase() === b.patente.toUpperCase())) {
        throw new Error("La patente ya esta registrada");
      }
      const id = nextVehiculoId++;
      const nuevo = {
        id_vehiculo: id,
        id_empresa: idEmpresa,
        id_conductor: null,
        patente: b.patente.toUpperCase(),
        marca: b.marca,
        modelo: b.modelo,
        anio: b.anio,
        color: b.color,
        tipo_vehiculo: b.tipo_vehiculo,
        condiciones: (b.condiciones ?? []).map((c, i) => ({
          id_condicion: id * 10 + i,
          id_vehiculo: id,
          condicion: c,
        })),
      } as VehiculoFlota;
      vehiculos.push(nuevo);
      return nuevo;
    }
  }

  const viajesDisponibles = rawPath.match(/^\/api\/empresas\/(\d+)\/viajes-disponibles$/);
  if (viajesDisponibles && method === "GET") {
    // El backend filtra por elegibilidad de la flota; acá alcanza con devolver
    // el mercado abierto ordenado por fecha, como documenta el contrato.
    return [...disponibles].sort(
      (a, b) => +new Date(a.fecha_programada) - +new Date(b.fecha_programada),
    );
  }

  const viajesEmpresa = rawPath.match(/^\/api\/empresas\/(\d+)\/viajes$/);
  if (viajesEmpresa && method === "GET") {
    const idEmpresa = Number(viajesEmpresa[1]);
    return viajes.filter((v) => v.id_empresa === idEmpresa);
  }

  const empresaDetalle = rawPath.match(/^\/api\/empresas\/(\d+)$/);
  if (empresaDetalle && method === "GET") {
    const empresa = empresas.find((e) => e.id_empresa === Number(empresaDetalle[1]));
    if (!empresa) throw new Error("Empresa no encontrada");
    const activos = conductores.filter((c) => c.estado === "ACTIVO");
    const calificados = activos.filter((c) => c.calificacion_promedio != null);
    const detalle: EmpresaDetalle = {
      ...empresa,
      calificacion_promedio: calificados.length
        ? calificados.reduce((a, c) => a + (c.calificacion_promedio ?? 0), 0) / calificados.length
        : null,
      cantidad_conductores_activos: activos.length,
    };
    return detalle;
  }

  // ---- Reserva y asignación ----

  const reservar = rawPath.match(/^\/api\/viajes\/(\d+)\/reservar$/);
  if (reservar && method === "POST") {
    const id = Number(reservar[1]);
    const idEmpresa = (body as { id_empresa?: number } | undefined)?.id_empresa ?? 1;
    if (buscarViaje(id)) throw new Error("El viaje ya no esta disponible");
    viajes.unshift(viajeReservado(id, idEmpresa));
    // Sale del mercado abierto: el backend emite `viaje:reservado` para lo mismo.
    disponibles = disponibles.filter((v) => v.id_viaje !== id);
    return { id_viaje: id, estado: "RESERVADO_POR_EMPRESA", id_empresa: idEmpresa };
  }

  const asignar = rawPath.match(/^\/api\/viajes\/(\d+)\/(asignar|reasignar)$/);
  if (asignar && method === "POST") {
    const viaje = buscarViaje(Number(asignar[1]));
    if (!viaje) throw new Error("Viaje no encontrado");
    const b = body as { id_conductor: number; id_vehiculo: number };
    const conductor = conductores.find((c) => c.id_conductor === b.id_conductor);
    const vehiculo = vehiculos.find((v) => v.id_vehiculo === b.id_vehiculo);
    if (!conductor || conductor.estado !== "ACTIVO") {
      throw new Error("El conductor no esta activo en la empresa");
    }
    if (!vehiculo) throw new Error("El vehiculo no pertenece a la flota");
    viaje.estado = "CONDUCTOR_ASIGNADO";
    viaje.id_conductor = conductor.id_conductor;
    viaje.id_vehiculo = vehiculo.id_vehiculo;
    viaje.conductor = {
      id_conductor: conductor.id_conductor,
      calificacion_promedio: conductor.calificacion_promedio,
      usuario: conductor.usuario,
    };
    viaje.vehiculo = {
      id_vehiculo: vehiculo.id_vehiculo,
      patente: vehiculo.patente,
      marca: vehiculo.marca,
      modelo: vehiculo.modelo,
      condiciones: vehiculo.condiciones.map((c) => ({ condicion: c.condicion })),
    };
    return {
      id_viaje: viaje.id_viaje,
      estado: viaje.estado,
      id_conductor: conductor.id_conductor,
      id_vehiculo: vehiculo.id_vehiculo,
    };
  }

  const cancelarReserva = rawPath.match(/^\/api\/viajes\/(\d+)\/cancelar-reserva$/);
  if (cancelarReserva && method === "POST") {
    const id = Number(cancelarReserva[1]);
    const i = viajes.findIndex((v) => v.id_viaje === id);
    if (i === -1) throw new Error("Viaje no encontrado");
    const [soltado] = viajes.splice(i, 1);
    // El backend republica el viaje de cero, así que vuelve al mercado abierto.
    disponibles.push({
      id_viaje: soltado.id_viaje,
      zona: soltado.zona,
      estado: "BUSCANDO_CONDUCTOR",
      precio_estimado: soltado.precio_estimado,
      fecha_programada: soltado.fecha_programada,
      descripcion: soltado.descripcion ?? null,
      paradas: soltado.paradas.map((p) => ({ orden: p.orden, direccion: p.direccion })),
      condiciones_req: soltado.condiciones_req,
      cliente: soltado.cliente,
    });
    return { id_viaje: id, estado: "BUSCANDO_CONDUCTOR" };
  }

  const iniciar = rawPath.match(/^\/api\/viajes\/(\d+)\/iniciar$/);
  if (iniciar && method === "POST") {
    const viaje = buscarViaje(Number(iniciar[1]));
    if (!viaje) throw new Error("Viaje no encontrado");
    if (viaje.estado !== "CONDUCTOR_ASIGNADO") {
      throw new Error(
        `Solo se puede iniciar un viaje en estado CONDUCTOR_ASIGNADO, el viaje actual esta en estado ${viaje.estado}`,
      );
    }
    viaje.estado = "EN_CAMINO_A_ORIGEN";
    viaje.fecha_inicio = new Date().toISOString();
    return {
      mensaje: "Viaje iniciado",
      id_viaje: viaje.id_viaje,
      estado: viaje.estado,
      fecha_inicio: viaje.fecha_inicio,
      puntualidad_inicio: "A_TIEMPO",
      iniciado_por: "GERENTE",
    };
  }

  return undefined;
}
