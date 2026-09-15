import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { calcularResumen, type ViajeResumenInput, type Vista } from "@/lib/analytics-cliente";
import { mockHistorialCliente } from "@/lib/mock-historial-cliente";

/**
 * BFF del Analytics de la PyME. Trae `mis-viajes` una sola vez y calcula el
 * período, el anterior y la serie del gráfico en `lib/analytics-cliente.ts`.
 * Cálculo de pantalla autorizado el 15-09 (`OPEN.md` → D6).
 *
 * Query: `desde`, `hasta` (ISO), `vista` (semanal|mensual|personalizado|todo),
 * `tz` (getTimezoneOffset del browser, en minutos).
 */

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const VISTAS: Vista[] = ["semanal", "mensual", "personalizado", "todo"];

export async function GET(request: NextRequest) {
  const MOCK = process.env.NEXT_PUBLIC_MOCK === "true";
  const { searchParams } = new URL(request.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const vistaParam = searchParams.get("vista") as Vista | null;
  const vista: Vista = vistaParam && VISTAS.includes(vistaParam) ? vistaParam : desde ? "personalizado" : "todo";
  const tz = Number(searchParams.get("tz") ?? 180);
  const opts = {
    desde: desde ? new Date(desde) : null,
    hasta: hasta ? new Date(hasta) : null,
    vista,
    tzOffsetMin: Number.isFinite(tz) ? tz : 180,
  };

  if (MOCK) {
    await new Promise((r) => setTimeout(r, 280));
    return Response.json(calcularResumen(mockHistorialCliente(), opts));
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json({ error: "No autenticado" }, { status: 401 });

  let viajes: ViajeResumenInput[];
  try {
    // Sin filtros: el período anterior y la serie necesitan más que el rango
    // pedido, y el contrato no documenta `desde`/`hasta` en este endpoint.
    const res = await fetch(`${API_URL}/api/viajes/mis-viajes`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Backend error ${res.status}`);
    viajes = await res.json();
  } catch {
    return Response.json({ error: "Error al obtener viajes" }, { status: 502 });
  }

  return Response.json(calcularResumen(viajes, opts));
}
