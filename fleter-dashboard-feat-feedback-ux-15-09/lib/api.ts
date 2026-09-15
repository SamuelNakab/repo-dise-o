"use client";

import { getAuthToken } from "./firebase";
import { gerenteMock } from "./mocks-gerente";
import { BASE_URL, MOCK } from "./config";
import type { Rol } from "./roles";

const MOCK_FIXTURES: Record<string, unknown> = {
  "/api/viajes/disponibles": [
    {
      id_viaje: 42,
      zona: "CABA",
      precio_estimado: 2500,
      fecha_programada: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      estado: "BUSCANDO_CONDUCTOR",
      paradas: [
        { orden: 1, direccion: "Plaza de Mayo, CABA", latitud: -34.6037, longitud: -58.3816 },
        { orden: 2, direccion: "Recoleta, CABA", latitud: -34.5895, longitud: -58.3974 },
      ],
      condiciones_req: [],
      cliente: { usuario: { nombre: "Juan", apellido: "Pérez", telefono: "+5491112345678" } },
    },
    {
      id_viaje: 43,
      zona: "PROVINCIA",
      precio_estimado: 8500,
      fecha_programada: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
      estado: "BUSCANDO_CONDUCTOR",
      paradas: [
        { orden: 1, direccion: "Microcentro, CABA", latitud: -34.6, longitud: -58.37 },
        { orden: 2, direccion: "La Plata, Buenos Aires", latitud: -34.92, longitud: -57.95 },
      ],
      condiciones_req: [{ condicion: "FRAGIL" }],
      cliente: { usuario: { nombre: "María", apellido: "García", telefono: "+5491187654321" } },
    },
  ],
  "/api/viajes": {
    id_viaje: 99,
    id_cliente: 1,
    id_conductor: null,
    id_vehiculo: null,
    estado: "BUSCANDO_CONDUCTOR",
    precio_estimado: 8500,
    zona: "CABA",
    paradas: [],
    condiciones_req: [],
    creado_en: new Date().toISOString(),
  },
  "/api/viajes/mis-viajes": [
    {
      id_viaje: 101,
      zona: "CABA",
      precio_estimado: 3200,
      precio_real: 2900,
      estado: "FINALIZADO",
      fecha_programada: "2026-05-10T09:00:00.000Z",
      creado_en: "2026-05-09T20:00:00.000Z",
      duracion_real: 95,
      duracion_estimada: 80,
      alertas_count: 0,
      paradas: [
        { orden: 1, direccion: "Av. Corrientes 1234, CABA" },
        { orden: 2, direccion: "Palermo Soho, CABA" },
      ],
      conductor: { usuario: { nombre: "Carlos", apellido: "López" } },
      vehiculo: { patente: "ABC123", marca: "Ford", modelo: "Transit", tipo_vehiculo: "furgon" },
    },
    {
      id_viaje: 102,
      zona: "PROVINCIA",
      precio_estimado: 9500,
      precio_real: 11200,
      estado: "FINALIZADO",
      fecha_programada: "2026-05-08T08:00:00.000Z",
      creado_en: "2026-05-07T18:00:00.000Z",
      duracion_real: 210,
      duracion_estimada: 240,
      alertas_count: 2,
      paradas: [
        { orden: 1, direccion: "Microcentro, CABA" },
        { orden: 2, direccion: "La Plata, Buenos Aires" },
      ],
      conductor: { usuario: { nombre: "Roberto", apellido: "Sanz" } },
      // Sin `vehiculo`: la card del detalle cae al estado vacío, que es lo que
      // pasa en un viaje sin conductor asignado.
      vehiculo: null,
    },
    {
      id_viaje: 103,
      zona: "MIXTO",
      precio_estimado: 6800,
      precio_real: null,
      estado: "EN_RUTA",
      fecha_programada: "2026-05-14T11:00:00.000Z",
      creado_en: "2026-05-14T10:30:00.000Z",
      duracion_real: null,
      duracion_estimada: 42,
      alertas_count: 0,
      paradas: [
        { orden: 1, direccion: "Once, CABA" },
        { orden: 2, direccion: "Quilmes, Buenos Aires" },
      ],
      conductor: { usuario: { nombre: "Carlos", apellido: "López" } },
    },
    {
      id_viaje: 104,
      zona: "CABA",
      precio_estimado: 2100,
      precio_real: null,
      estado: "CANCELADO",
      fecha_programada: "2026-05-05T14:00:00.000Z",
      creado_en: "2026-05-05T12:00:00.000Z",
      duracion_real: null,
      duracion_estimada: 60,
      alertas_count: 0,
      paradas: [
        { orden: 1, direccion: "Retiro, CABA" },
        { orden: 2, direccion: "Belgrano, CABA" },
      ],
      conductor: null,
    },
    {
      id_viaje: 105,
      zona: "CABA",
      precio_estimado: 4400,
      precio_real: 4400,
      estado: "FINALIZADO",
      fecha_programada: "2026-05-02T07:00:00.000Z",
      creado_en: "2026-05-01T22:00:00.000Z",
      duracion_real: 60,
      duracion_estimada: 55,
      alertas_count: 0,
      paradas: [
        { orden: 1, direccion: "Puerto Madero, CABA" },
        { orden: 2, direccion: "San Telmo, CABA" },
      ],
      conductor: { usuario: { nombre: "Miguel", apellido: "Torres" } },
    },
    {
      id_viaje: 106,
      zona: "PROVINCIA",
      precio_estimado: 7200,
      precio_real: 6800,
      estado: "FINALIZADO",
      fecha_programada: "2026-05-03T10:00:00.000Z",
      creado_en: "2026-05-02T22:00:00.000Z",
      duracion_real: 180,
      duracion_estimada: 150,
      alertas_count: 1,
      paradas: [
        { orden: 1, direccion: "Villa Urquiza, CABA" },
        { orden: 2, direccion: "Tigre, Buenos Aires" },
      ],
      conductor: { usuario: { nombre: "Diego", apellido: "Méndez" } },
    },
    {
      id_viaje: 107,
      zona: "CABA",
      precio_estimado: 1800,
      precio_real: null,
      estado: "BUSCANDO_CONDUCTOR",
      fecha_programada: "2026-05-15T15:00:00.000Z",
      creado_en: "2026-05-14T12:00:00.000Z",
      duracion_real: null,
      duracion_estimada: 90,
      alertas_count: 0,
      paradas: [
        { orden: 1, direccion: "Flores, CABA" },
        { orden: 2, direccion: "Caballito, CABA" },
      ],
      conductor: null,
    },
    {
      id_viaje: 108,
      zona: "MIXTO",
      precio_estimado: 12000,
      precio_real: 13500,
      estado: "FINALIZADO",
      fecha_programada: "2026-05-06T06:00:00.000Z",
      creado_en: "2026-05-05T20:00:00.000Z",
      duracion_real: 300,
      duracion_estimada: 300,
      alertas_count: 0,
      paradas: [
        { orden: 1, direccion: "Constitución, CABA" },
        { orden: 2, direccion: "Mar del Plata, Buenos Aires" },
      ],
      conductor: { usuario: { nombre: "Hernán", apellido: "Castro" } },
    },
    {
      id_viaje: 109,
      zona: "CABA",
      precio_estimado: 2700,
      precio_real: 2700,
      estado: "FINALIZADO",
      fecha_programada: "2026-05-07T13:00:00.000Z",
      creado_en: "2026-05-07T11:00:00.000Z",
      duracion_real: 45,
      duracion_estimada: 40,
      alertas_count: 0,
      paradas: [
        { orden: 1, direccion: "Núñez, CABA" },
        { orden: 2, direccion: "Saavedra, CABA" },
      ],
      conductor: { usuario: { nombre: "Lucas", apellido: "Ferrari" } },
    },
    {
      id_viaje: 110,
      zona: "PROVINCIA",
      precio_estimado: 5500,
      precio_real: 5100,
      estado: "FINALIZADO",
      fecha_programada: "2026-05-09T08:00:00.000Z",
      creado_en: "2026-05-08T18:00:00.000Z",
      duracion_real: 120,
      duracion_estimada: 110,
      alertas_count: 0,
      paradas: [
        { orden: 1, direccion: "Almagro, CABA" },
        { orden: 2, direccion: "Morón, Buenos Aires" },
      ],
      conductor: { usuario: { nombre: "Pablo", apellido: "Ríos" } },
    },
    {
      id_viaje: 90,
      zona: "CABA",
      precio_estimado: 3100,
      precio_real: 3400,
      estado: "FINALIZADO",
      fecha_programada: "2026-04-15T10:00:00.000Z",
      creado_en: "2026-04-14T20:00:00.000Z",
      duracion_real: 75,
      alertas_count: 0,
      paradas: [
        { orden: 1, direccion: "Recoleta, CABA" },
        { orden: 2, direccion: "Villa Crespo, CABA" },
      ],
      conductor: { usuario: { nombre: "Sebastián", apellido: "Ortiz" } },
    },
  ],
  "/api/conductores/mis-vehiculos": [
    {
      id_vehiculo: 1,
      id_empresa: null,
      id_conductor: 1,
      patente: "ABC123",
      marca: "Ford",
      modelo: "Transit",
      anio: 2021,
      color: "Blanco",
      tipo_vehiculo: "furgon",
      condiciones: [
        { id_condicion: 1, id_vehiculo: 1, condicion: "FRAGIL" },
      ],
    },
    {
      id_vehiculo: 2,
      id_empresa: null,
      id_conductor: 1,
      patente: "XY567AB",
      marca: "Mercedes-Benz",
      modelo: "Sprinter",
      anio: 2019,
      color: "Gris",
      tipo_vehiculo: "camion",
      condiciones: [],
    },
  ],
  // Forma del contrato (`GET /api/viajes/mis-viajes-conductor`). Hasta el 15-09
  // el fixture no traía fecha, precio ni zona, así que "Mis viajes" no podía
  // mostrarlos ni en MOCK.
  "/api/viajes/mis-viajes-conductor": [
    {
      id_viaje: 201,
      zona: "PROVINCIA",
      precio_estimado: 38500,
      precio_real: null,
      estado: "CONDUCTOR_ASIGNADO",
      fecha_programada: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
      descripcion: "12 pallets. Portón azul, avisar 10 min antes.",
      creado_en: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
      paradas: [
        { orden: 1, direccion: "Av. Warnes 1840, CABA", estado: "PENDIENTE", fecha_entrega: null },
        { orden: 2, direccion: "Av. Crovara 4250, La Tablada", estado: "PENDIENTE", fecha_entrega: null },
      ],
      cliente: { usuario: { nombre: "Mariana", apellido: "Vázquez", telefono: "+5491155554444" } },
    },
    {
      id_viaje: 205,
      zona: "MIXTO",
      precio_estimado: 52000,
      precio_real: null,
      estado: "CONDUCTOR_ASIGNADO",
      fecha_programada: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      descripcion: null,
      creado_en: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      paradas: [
        { orden: 1, direccion: "Av. Corrientes 1234, CABA", estado: "PENDIENTE", fecha_entrega: null },
        { orden: 2, direccion: "Mercado Central, Tapiales", estado: "PENDIENTE", fecha_entrega: null },
        { orden: 3, direccion: "Parque Industrial Pilar", estado: "PENDIENTE", fecha_entrega: null },
      ],
      cliente: { usuario: { nombre: "Juan", apellido: "Pérez", telefono: "+5491112345678" } },
    },
    {
      id_viaje: 203,
      zona: "MIXTO",
      precio_estimado: 27000,
      precio_real: null,
      estado: "EN_RUTA",
      fecha_programada: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      descripcion: null,
      creado_en: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      paradas: [
        { orden: 1, direccion: "Retiro, CABA", estado: "ENTREGADO", fecha_entrega: new Date(Date.now() - 25 * 60 * 1000).toISOString() },
        { orden: 2, direccion: "Tigre, Buenos Aires", estado: "PENDIENTE", fecha_entrega: null },
      ],
      cliente: { usuario: { nombre: "Roberto", apellido: "Sanz", telefono: "+5491199887766" } },
    },
    {
      id_viaje: 202,
      zona: "PROVINCIA",
      precio_estimado: 45000,
      precio_real: 47800,
      estado: "FINALIZADO",
      fecha_programada: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      descripcion: null,
      creado_en: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      paradas: [
        { orden: 1, direccion: "Microcentro, CABA", estado: "ENTREGADO", fecha_entrega: null },
        { orden: 2, direccion: "La Plata, Buenos Aires", estado: "ENTREGADO", fecha_entrega: null },
      ],
      cliente: { usuario: { nombre: "María", apellido: "García", telefono: "+5491187654321" } },
    },
    {
      id_viaje: 204,
      zona: "CABA",
      precio_estimado: 16000,
      precio_real: null,
      estado: "CANCELADO",
      fecha_programada: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
      descripcion: null,
      creado_en: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      paradas: [
        { orden: 1, direccion: "Once, CABA", estado: "PENDIENTE", fecha_entrega: null },
        { orden: 2, direccion: "Palermo Soho, CABA", estado: "PENDIENTE", fecha_entrega: null },
      ],
      cliente: { usuario: { nombre: "Laura", apellido: "Méndez", telefono: null } },
    },
  ],
  "/api/viajes/103/detalle": {
    id_viaje: 103,
    zona: "MIXTO",
    precio_estimado: 6800,
    precio_real: null,
    descripcion: null,
    estado: "EN_RUTA",
    fecha_programada: "2026-05-14T11:00:00.000Z",
    fecha_inicio: "2026-05-14T11:12:00.000Z",
    puntualidad_inicio: "A_TIEMPO",
    // Minutos enteros = round(duracion_estimada_horas * 60).
    duracion_estimada: 42,
    creado_en: "2026-05-14T10:30:00.000Z",
    paradas: [
      {
        orden: 1,
        direccion: "Once, CABA",
        latitud: -34.6087,
        longitud: -58.4088,
        estado: "ENTREGADO",
        fecha_entrega: "2026-05-14T11:28:00.000Z",
      },
      {
        orden: 2,
        direccion: "Quilmes, Buenos Aires",
        latitud: -34.7206,
        longitud: -58.2535,
        estado: "PENDIENTE",
        fecha_entrega: null,
      },
    ],
    condiciones_req: [],
    ruta_planeada: [
      [-58.4088, -34.6087],
      [-58.4012, -34.6155],
      [-58.3705, -34.6298],
      [-58.3402, -34.6512],
      [-58.3001, -34.6789],
      [-58.2755, -34.7012],
      [-58.2535, -34.7206],
    ],
    cliente: {
      id_cliente: 1,
      usuario: { nombre: "Joaquín", apellido: "Test", email: "joaco@fleter.com" },
    },
    conductor: {
      id_conductor: 7,
      calificacion_promedio: 4.8,
      usuario: { nombre: "Carlos", apellido: "López", telefono: "+5491187654321" },
    },
    vehiculo: {
      patente: "ABC123",
      marca: "Ford",
      modelo: "Transit",
      tipo_vehiculo: "furgon",
      color: "Blanco",
    },
  },
  // Viaje MIXTO: se cobran las dos magnitudes, pero prorrateadas por
  // `fraccion_caba` (1 de las 2 paradas cae en CABA). Los totales medidos son
  // 0.7 h y 21 km; lo facturado es la mitad de cada uno.
  "/api/viajes/103/costo-acumulado": {
    precio_acumulado: 2100,
    desglose: {
      precio_por_tiempo: 1050,
      precio_por_distancia: 1050,
      tiempo_horas: 0.7,
      distancia_km: 21,
      tiempo_capital: 0.35,
      distancia_provincia: 10.5,
      fraccion_caba: 0.5,
      tarifa_hora: 3000,
      tarifa_km: 100,
      es_hora_pico: false,
    },
  },
  // Costo en vivo del viaje 495 del panel de gerente (EN_RUTA, zona CABA:
  // sólo se cobra tiempo).
  "/api/viajes/495/costo-acumulado": {
    precio_acumulado: 6250,
    desglose: {
      precio_por_tiempo: 6250,
      precio_por_distancia: null,
      tiempo_horas: 1.25,
      distancia_km: 14.8,
      tiempo_capital: 1.25,
      distancia_provincia: null,
      fraccion_caba: 1,
      tarifa_hora: 5000,
      tarifa_km: null,
      es_hora_pico: false,
    },
  },
  "/api/auth/me": {
    id_usuario: 1,
    nombre: "Joaquín",
    apellido: "Test",
    email: "joaco@fleter.com",
    dni: "30123456",
    telefono: "+5491112345678",
    fecha_registro: "2026-01-15T00:00:00.000Z",
    rol: (process.env.NEXT_PUBLIC_MOCK_ROLE ?? "CLIENTE") as Rol,
  },
};

// ---- Datos MOCK del panel de administración ----

const ADMIN_USUARIOS = [
  {
    id_usuario: 1, nombre: "Joaquín", apellido: "Test", dni: "30123456",
    email: "joaco@fleter.com", telefono: "+5491112345678", rol: "ADMIN",
    fecha_registro: "2026-01-15T00:00:00.000Z",
    cliente: null, conductor: null, empresas_gerente: [],
  },
  {
    id_usuario: 3, nombre: "Juan", apellido: "Pérez", dni: "12345678",
    email: "juan@example.com", telefono: "+5491112345678", rol: "CLIENTE",
    fecha_registro: "2026-06-28T12:00:00.000Z",
    cliente: { id_cliente: 3, id_usuario: 3, cuit: "20-12345678-9", nombre_empresa: "PyME Demo S.A.", direccion_principal: "Av. Corrientes 1234, CABA" },
    conductor: null, empresas_gerente: [],
  },
  {
    id_usuario: 5, nombre: "Carlos", apellido: "López", dni: "23456789",
    email: "carlos@example.com", telefono: "+5491187654321", rol: "CONDUCTOR",
    fecha_registro: "2026-06-20T12:00:00.000Z",
    cliente: null,
    conductor: { id_conductor: 4, id_usuario: 5, nro_licencia: "LIC001", licencia_vencimiento: "2028-01-01T00:00:00.000Z", calificacion_promedio: 4.8 },
    empresas_gerente: [],
  },
  {
    id_usuario: 7, nombre: "Roberto", apellido: "Sanz", dni: "34567890",
    email: "roberto@example.com", telefono: "+5491199887766", rol: "CONDUCTOR",
    fecha_registro: "2026-06-15T12:00:00.000Z",
    cliente: null,
    conductor: { id_conductor: 6, id_usuario: 7, nro_licencia: "LIC077", licencia_vencimiento: "2027-06-30T00:00:00.000Z", calificacion_promedio: 4.5 },
    empresas_gerente: [],
  },
  {
    id_usuario: 9, nombre: "María", apellido: "García", dni: "27888999",
    email: "maria@empresa.com", telefono: "+5491133445566", rol: "GERENTE",
    fecha_registro: "2026-05-30T12:00:00.000Z",
    cliente: null, conductor: null,
    empresas_gerente: [{ id_empresa: 2, nombre: "Fletes García SRL", cuit: "30-70801234-5" }],
  },
  {
    id_usuario: 11, nombre: "Laura", apellido: "Méndez", dni: "31222333",
    email: "laura@example.com", telefono: null, rol: "CLIENTE",
    fecha_registro: "2026-05-10T12:00:00.000Z",
    cliente: { id_cliente: 8, id_usuario: 11, cuit: null, nombre_empresa: null, direccion_principal: null },
    conductor: null, empresas_gerente: [],
  },
];

const ADMIN_USUARIO_DETALLE: Record<number, unknown> = {
  3: {
    ...ADMIN_USUARIOS[1],
    cliente: {
      ...ADMIN_USUARIOS[1].cliente,
      viajes: [
        { id_viaje: 42, estado: "FINALIZADO", precio_real: 1750, creado_en: "2026-06-29T12:00:00.000Z" },
        { id_viaje: 51, estado: "CANCELADO", precio_real: null, creado_en: "2026-06-25T09:00:00.000Z" },
      ],
    },
  },
  5: {
    ...ADMIN_USUARIOS[2],
    conductor: {
      ...ADMIN_USUARIOS[2].conductor,
      vehiculos: [
        { id_vehiculo: 10, patente: "FLT001", marca: "Ford", modelo: "Transit", anio: 2020, color: "Blanco", tipo_vehiculo: "furgon", condiciones: [{ condicion: "FRAGIL" }] },
      ],
      viajes: [
        { id_viaje: 42, estado: "FINALIZADO", precio_real: 1750, creado_en: "2026-06-29T12:00:00.000Z" },
        { id_viaje: 60, estado: "FINALIZADO", precio_real: 3200, creado_en: "2026-06-27T14:00:00.000Z" },
      ],
    },
  },
  9: {
    ...ADMIN_USUARIOS[4],
    empresas: [
      { id_empresa: 2, nombre: "Fletes García SRL", cuit: "30-70801234-5" },
    ],
  },
};

const ADMIN_VIAJES = [
  { id_viaje: 42, zona: "CABA", estado: "FINALIZADO", precio_estimado: 2500, precio_real: 1750, fecha_programada: "2026-07-01T10:00:00.000Z", creado_en: "2026-06-29T12:00:00.000Z", cliente: { usuario: { nombre: "Juan", apellido: "Pérez", email: "juan@example.com" } }, conductor: { usuario: { nombre: "Carlos", apellido: "López" } }, _count: { paradas: 2 } },
  { id_viaje: 43, zona: "PROVINCIA", estado: "BUSCANDO_CONDUCTOR", precio_estimado: 8500, precio_real: null, fecha_programada: "2026-07-02T09:00:00.000Z", creado_en: "2026-06-30T08:00:00.000Z", cliente: { usuario: { nombre: "Laura", apellido: "Méndez", email: "laura@example.com" } }, conductor: null, _count: { paradas: 2 } },
  { id_viaje: 60, zona: "CABA", estado: "FINALIZADO", precio_estimado: 3000, precio_real: 3200, fecha_programada: "2026-06-27T14:00:00.000Z", creado_en: "2026-06-27T12:00:00.000Z", cliente: { usuario: { nombre: "Juan", apellido: "Pérez", email: "juan@example.com" } }, conductor: { usuario: { nombre: "Carlos", apellido: "López" } }, _count: { paradas: 3 } },
  { id_viaje: 61, zona: "MIXTO", estado: "EN_RUTA", precio_estimado: 6800, precio_real: null, fecha_programada: "2026-07-01T11:00:00.000Z", creado_en: "2026-07-01T10:30:00.000Z", cliente: { usuario: { nombre: "Laura", apellido: "Méndez", email: "laura@example.com" } }, conductor: { usuario: { nombre: "Roberto", apellido: "Sanz" } }, _count: { paradas: 2 } },
  { id_viaje: 51, zona: "CABA", estado: "CANCELADO", precio_estimado: 2100, precio_real: null, fecha_programada: "2026-06-25T14:00:00.000Z", creado_en: "2026-06-25T09:00:00.000Z", cliente: { usuario: { nombre: "Juan", apellido: "Pérez", email: "juan@example.com" } }, conductor: null, _count: { paradas: 2 } },
];

const ADMIN_VIAJE_DETALLE: Record<number, unknown> = {
  42: {
    id_viaje: 42, zona: "CABA", estado: "FINALIZADO", precio_estimado: 2500, precio_real: 1750, fee: 175,
    remito_url: "https://pub.r2.example.com/remitos/42.pdf", motivo_cancelacion: null,
    cancelado_por_admin_id: null, cancelado_por_admin: null,
    fecha_programada: "2026-07-01T10:00:00.000Z", creado_en: "2026-06-29T12:00:00.000Z",
    paradas: [
      { orden: 1, direccion: "Plaza de Mayo, CABA", estado: "ENTREGADO", fecha_entrega: "2026-07-01T11:00:00.000Z" },
      { orden: 2, direccion: "Recoleta, CABA", estado: "ENTREGADO", fecha_entrega: "2026-07-01T11:40:00.000Z" },
    ],
    condiciones_req: [],
    cliente: { id_cliente: 3, usuario: { nombre: "Juan", apellido: "Pérez", email: "juan@example.com" } },
    conductor: { id_conductor: 4, calificacion_promedio: 4.8, usuario: { nombre: "Carlos", apellido: "López" } },
    vehiculo: { id_vehiculo: 10, patente: "FLT001", marca: "Ford", modelo: "Transit" },
    calificacion: { puntaje: 5, comentario: "Excelente", fecha_hora: "2026-07-01T11:45:00.000Z" },
  },
  61: {
    id_viaje: 61, zona: "MIXTO", estado: "EN_RUTA", precio_estimado: 6800, precio_real: null, fee: null,
    remito_url: null, motivo_cancelacion: null, cancelado_por_admin_id: null, cancelado_por_admin: null,
    fecha_programada: "2026-07-01T11:00:00.000Z", creado_en: "2026-07-01T10:30:00.000Z",
    paradas: [
      { orden: 1, direccion: "Once, CABA", estado: "ENTREGADO", fecha_entrega: "2026-07-01T11:28:00.000Z" },
      { orden: 2, direccion: "Quilmes, Buenos Aires", estado: "PENDIENTE", fecha_entrega: null },
    ],
    condiciones_req: [{ condicion: "FRAGIL" }],
    cliente: { id_cliente: 8, usuario: { nombre: "Laura", apellido: "Méndez", email: "laura@example.com" } },
    conductor: { id_conductor: 6, calificacion_promedio: 4.5, usuario: { nombre: "Roberto", apellido: "Sanz" } },
    vehiculo: { id_vehiculo: 12, patente: "XY567AB", marca: "Mercedes-Benz", modelo: "Sprinter" },
    calificacion: null,
  },
};

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const ADMIN_ESTADISTICAS = {
  usuarios: {
    total: ADMIN_USUARIOS.length,
    por_rol: { CLIENTE: 2, CONDUCTOR: 2, GERENTE: 1, ADMIN: 1 },
    registrados_ultimo_mes: 4,
    registrados_por_dia_ultimos_30_dias: Array.from({ length: 30 }, (_, i) => ({
      fecha: isoDaysAgo(29 - i),
      cantidad: [0, 0, 1, 0, 0, 2, 0, 1, 0, 0, 0, 3, 0, 0, 1, 0, 0, 0, 2, 0, 1, 0, 0, 0, 1, 0, 2, 0, 0, 1][i],
    })),
  },
  viajes: {
    total: ADMIN_VIAJES.length,
    por_estado: {
      BUSCANDO_CONDUCTOR: 1, CONDUCTOR_ASIGNADO: 0, EN_CAMINO_A_ORIGEN: 0,
      CARGANDO: 0, EN_RUTA: 1, DESCARGANDO: 0, FINALIZADO: 2, CANCELADO: 1,
    },
    por_dia_ultimos_30_dias: Array.from({ length: 30 }, (_, i) => ({
      fecha: isoDaysAgo(29 - i),
      cantidad_creados: [0, 1, 0, 2, 0, 1, 3, 0, 1, 0, 2, 0, 1, 4, 0, 1, 0, 2, 0, 3, 1, 0, 2, 0, 1, 0, 3, 1, 0, 2][i],
      cantidad_finalizados: [0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 0, 0, 2, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 2, 0, 0, 1][i],
    })),
  },
  plata: {
    total_precio_real_finalizados: 4950,
    total_fee_app: 495,
    total_neto_conductores: 4455,
    top_conductores_por_ganancia: [
      { id_conductor: 4, nombre: "Carlos", apellido: "López", total_ganado: 4950, cantidad_viajes: 2 },
    ],
    top_clientes_por_gasto: [
      { id_cliente: 3, nombre: "Juan", apellido: "Pérez", total_gastado: 4950, cantidad_viajes: 2 },
    ],
  },
};

function paginate<T>(items: T[], page: number, limit: number) {
  const start = (page - 1) * limit;
  return items.slice(start, start + limit);
}

/**
 * Resuelve las respuestas MOCK de los endpoints /api/admin/*. Devuelve
 * `undefined` si el path no corresponde a admin (para seguir con el resto).
 */
function adminMock(path: string, method: string, body: unknown): unknown | undefined {
  const [rawPath, queryString] = path.split("?");
  const q = new URLSearchParams(queryString ?? "");

  if (rawPath === "/api/admin/estadisticas") return ADMIN_ESTADISTICAS;

  if (rawPath === "/api/admin/usuarios") {
    const rol = q.get("rol");
    const page = Math.max(1, parseInt(q.get("page") ?? "1", 10));
    const limit = Math.min(200, Math.max(1, parseInt(q.get("limit") ?? "50", 10)));
    const filtered = rol ? ADMIN_USUARIOS.filter((u) => u.rol === rol) : ADMIN_USUARIOS;
    return { total: filtered.length, page, limit, usuarios: paginate(filtered, page, limit) };
  }

  const usuarioDetalle = rawPath.match(/^\/api\/admin\/usuarios\/(\d+)$/);
  if (usuarioDetalle) {
    const id = parseInt(usuarioDetalle[1], 10);
    return ADMIN_USUARIO_DETALLE[id] ?? ADMIN_USUARIOS.find((u) => u.id_usuario === id) ?? null;
  }

  const cancelar = rawPath.match(/^\/api\/admin\/viajes\/(\d+)\/cancelar$/);
  if (cancelar && method === "POST") {
    const id = parseInt(cancelar[1], 10);
    const motivo = (body as { motivo?: string } | undefined)?.motivo ?? null;
    return { mensaje: "Viaje cancelado por admin", id_viaje: id, estado: "CANCELADO", motivo };
  }

  if (rawPath === "/api/admin/viajes") {
    const estado = q.get("estado");
    const zona = q.get("zona");
    const page = Math.max(1, parseInt(q.get("page") ?? "1", 10));
    const limit = Math.min(200, Math.max(1, parseInt(q.get("limit") ?? "50", 10)));
    let filtered = ADMIN_VIAJES;
    if (estado) filtered = filtered.filter((v) => v.estado === estado);
    if (zona) filtered = filtered.filter((v) => v.zona === zona);
    return { total: filtered.length, page, limit, viajes: paginate(filtered, page, limit) };
  }

  const viajeDetalle = rawPath.match(/^\/api\/admin\/viajes\/(\d+)$/);
  if (viajeDetalle) {
    const id = parseInt(viajeDetalle[1], 10);
    if (ADMIN_VIAJE_DETALLE[id]) return ADMIN_VIAJE_DETALLE[id];
    const listItem = ADMIN_VIAJES.find((v) => v.id_viaje === id);
    if (!listItem) throw new Error("Viaje no encontrado");
    // Detalle mínimo derivado del item de lista para ids sin fixture propio.
    return {
      ...listItem, fee: null, remito_url: null, motivo_cancelacion: null,
      cancelado_por_admin_id: null, cancelado_por_admin: null,
      paradas: [], condiciones_req: [],
      cliente: listItem.cliente ? { id_cliente: 0, ...listItem.cliente } : null,
      conductor: listItem.conductor ? { id_conductor: 0, calificacion_promedio: null, ...listItem.conductor } : null,
      vehiculo: null, calificacion: null,
    };
  }

  return undefined;
}


/**
 * Error de la API que conserva el status HTTP. El contrato distingue casos que
 * el mensaje solo no permite separar: un `409` significa que otro ganó la
 * carrera y hay que refrescar, no reintentar; un `400` es input a corregir.
 *
 * `message` sigue siendo el `error` del body, así que el código que sólo hace
 * `(err as Error).message` no necesita cambiar.
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** `true` si el error viene de la API y tiene ese status. */
export function esStatus(err: unknown, status: number): boolean {
  return err instanceof ApiError && err.status === status;
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  if (MOCK) {
    if (path.startsWith("/api/admin/")) {
      const body = options.body ? JSON.parse(options.body as string) : undefined;
      const result = adminMock(path, options.method ?? "GET", body);
      if (result !== undefined) {
        await new Promise((r) => setTimeout(r, 300));
        return result as T;
      }
    }

    if (path.startsWith("/api/empresas") || /^\/api\/viajes\/\d+\/(reservar|asignar|reasignar|cancelar-reserva|iniciar)$/.test(path)) {
      const body = options.body ? JSON.parse(options.body as string) : undefined;
      const result = gerenteMock(path, options.method ?? "GET", body);
      if (result !== undefined) {
        await new Promise((r) => setTimeout(r, 300));
        return result as T;
      }
    }

    const deleteVehiculo = path.match(/^\/api\/conductores\/mis-vehiculos\/(\d+)$/);
    if (deleteVehiculo && options.method === "DELETE") {
      await new Promise((r) => setTimeout(r, 300));
      return { mensaje: "Vehiculo eliminado" } as T;
    }

    const remito = path.match(/^\/api\/viajes\/(\d+)\/remito$/);
    if (remito) {
      await new Promise((r) => setTimeout(r, 300));
      // El endpoint devuelve JSON con la URL pública del PDF, no el PDF.
      return { remito_url: `https://pub.r2.example.com/remitos/${remito[1]}.pdf` } as T;
    }

    const costoAcumulado = path.match(/^\/api\/viajes\/(\d+)\/costo-acumulado$/);
    if (costoAcumulado) {
      const id = parseInt(costoAcumulado[1], 10);
      const fixture = MOCK_FIXTURES[`/api/viajes/${id}/costo-acumulado`];
      await new Promise((r) => setTimeout(r, 300));
      if (fixture) return fixture as T;
      return { precio_acumulado: 0, desglose: null } as T;
    }

    const dynamicViaje = path.match(/^\/api\/viajes\/(\d+)$/);
    if (dynamicViaje) {
      const id = parseInt(dynamicViaje[1], 10);
      const detailed = MOCK_FIXTURES[`/api/viajes/${id}/detalle`];
      if (detailed) {
        await new Promise((r) => setTimeout(r, 300));
        return detailed as T;
      }
      // El detalle cae a los listados del cliente y del conductor. El del
      // conductor no trae coordenadas ni `ruta_planeada`: sirve para probar el
      // fallback de Google Directions del mapa.
      const listas = [
        MOCK_FIXTURES["/api/viajes/mis-viajes"],
        MOCK_FIXTURES["/api/viajes/mis-viajes-conductor"],
      ] as { id_viaje: number }[][];
      const found = listas.flat().find((v) => v.id_viaje === id);
      await new Promise((r) => setTimeout(r, 300));
      if (found) {
        return {
          condiciones_req: [],
          ruta_planeada: null,
          duracion_estimada: null,
          fecha_inicio: null,
          puntualidad_inicio: null,
          vehiculo: null,
          empresa: null,
          ...found,
        } as T;
      }
      throw new Error("Viaje no encontrado");
    }
    if (MOCK_FIXTURES[path] !== undefined) {
      await new Promise((r) => setTimeout(r, 300));
      return MOCK_FIXTURES[path] as T;
    }
  }

  const token = await getAuthToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.error ?? `Error ${res.status}`, res.status);
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  put: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  delete: <T>(path: string) =>
    apiFetch<T>(path, { method: "DELETE" }),
};
