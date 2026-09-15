import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import type { ViajeResumenInput } from "@/lib/analytics-cliente";
import { agruparComprobantes } from "@/lib/facturacion-cliente";
import { mockHistorialCliente } from "@/lib/mock-historial-cliente";

/**
 * BFF de Facturación de la PyME: comprobantes (viajes finalizados) agrupados por
 * mes con un total **informativo**. No es liquidación ni factura (`OPEN.md` → D3).
 *
 * Query: `tz` (getTimezoneOffset del browser, en minutos).
 */

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function GET(request: NextRequest) {
  const MOCK = process.env.NEXT_PUBLIC_MOCK === "true";
  const tzParam = Number(new URL(request.url).searchParams.get("tz") ?? 180);
  const tz = Number.isFinite(tzParam) ? tzParam : 180;

  if (MOCK) {
    await new Promise((r) => setTimeout(r, 250));
    return Response.json({ meses: agruparComprobantes(mockHistorialCliente(), tz) });
  }

  const token = (await cookies()).get("token")?.value;
  if (!token) return Response.json({ error: "No autenticado" }, { status: 401 });

  try {
    const res = await fetch(`${API_URL}/api/viajes/mis-viajes`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Backend error ${res.status}`);
    const viajes: ViajeResumenInput[] = await res.json();
    return Response.json({ meses: agruparComprobantes(viajes, tz) });
  } catch {
    return Response.json({ error: "Error al obtener viajes" }, { status: 502 });
  }
}
