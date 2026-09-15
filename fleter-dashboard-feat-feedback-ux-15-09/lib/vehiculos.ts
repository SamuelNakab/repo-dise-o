import type { Condicion } from "./types-empresa";

/**
 * Única fuente de los tipos de vehículo y de las condiciones de carga. Estaban
 * copiados en `pedir-viaje`, `mis-vehiculos` y `registro-vehiculo`.
 *
 * `tipo_vehiculo` es string libre en el contrato, no un enum: estos son los
 * valores que manda el front, pero al mostrar hay que tolerar cualquier otro.
 */
export const TIPOS_VEHICULO = [
  { value: "utilitario", label: "Utilitario", desc: "Kangoo, Partner, Berlingo" },
  { value: "pickup",     label: "Pick-up",    desc: "Hilux, Ranger, Amarok" },
  { value: "camioneta",  label: "Camioneta",  desc: "Caja cerrada chica" },
  { value: "furgon",     label: "Furgón",     desc: "Transit, Sprinter, Master" },
  { value: "camion",     label: "Camión",     desc: "Caja o chasis mediano" },
] as const;

export const CONDICIONES_CARGA: { value: Condicion; label: string }[] = [
  { value: "FRAGIL",       label: "Frágil" },
  { value: "REFRIGERADO",  label: "Refrigerado" },
  { value: "CARGA_PESADA", label: "Carga pesada" },
  { value: "PELIGROSO",    label: "Peligroso" },
  { value: "VOLUMINOSO",   label: "Voluminoso" },
];

export function etiquetaTipoVehiculo(tipo: string | null | undefined): string {
  if (!tipo) return "—";
  return TIPOS_VEHICULO.find((t) => t.value === tipo)?.label ?? tipo;
}

export function etiquetaCondicion(c: string): string {
  return CONDICIONES_CARGA.find((x) => x.value === c)?.label ?? c.replace(/_/g, " ");
}

export const ANIO_VEHICULO_MIN = 1990;
