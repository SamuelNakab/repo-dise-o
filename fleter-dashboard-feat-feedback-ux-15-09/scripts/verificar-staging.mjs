#!/usr/bin/env node
/**
 * Chequea contra staging que los campos nuevos del contrato del 19-08 lleguen
 * de verdad. No arregla nada: sólo compara lo que llega con lo que el contrato
 * promete, y para cada campo dice si vino, si vino null o si falta la clave.
 *
 * Uso:
 *   FLETER_TOKEN='<id token>' node scripts/verificar-staging.mjs
 *   FLETER_TOKEN='...' FLETER_EMPRESA=1 node scripts/verificar-staging.mjs
 *
 * Para sacar el token: logueate en la app con `npm run dev` y, en la consola del
 * browser (F12), corré:
 *
 *     copy(await __fleterToken())
 *
 * Queda en el portapapeles. `__fleterToken` sólo existe en `next dev`.
 *
 * El token dura 1 hora. Si empieza a dar 401, sacá uno nuevo.
 */

const BASE = process.env.FLETER_API ?? "https://nombre-proyecto-back-staging.up.railway.app";
const TOKEN = process.env.FLETER_TOKEN;
const EMPRESA = process.env.FLETER_EMPRESA;

if (!TOKEN) {
  console.error("Falta FLETER_TOKEN. Ver el comentario de arriba para sacarlo.");
  process.exit(1);
}

const ok = (s) => `\x1b[32m${s}\x1b[0m`;
const bad = (s) => `\x1b[31m${s}\x1b[0m`;
const warn = (s) => `\x1b[33m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

let fallos = 0;

async function get(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

/** ¿La clave existe? Distingue "no vino" de "vino en null", que no es lo mismo. */
function campo(obj, clave) {
  if (obj == null || !(clave in obj)) return { estado: "FALTA" };
  return { estado: obj[clave] === null ? "NULL" : "OK", valor: obj[clave] };
}

function reportar(titulo, obj, claves) {
  console.log(`\n${titulo}`);
  if (obj == null) {
    console.log(`  ${bad("sin datos")}`);
    fallos++;
    return;
  }
  for (const [clave, exigido] of Object.entries(claves)) {
    const r = campo(obj, clave);
    if (r.estado === "FALTA") {
      console.log(`  ${bad("FALTA")}  ${clave}  ${dim("— el contrato lo documenta")}`);
      fallos++;
    } else if (r.estado === "NULL") {
      const etiqueta = exigido ? warn("NULL ") : dim("null ");
      console.log(`  ${etiqueta}  ${clave}`);
    } else {
      const v = typeof r.valor === "object" ? JSON.stringify(r.valor).slice(0, 60) : r.valor;
      console.log(`  ${ok("OK   ")}  ${clave} = ${dim(String(v))}`);
    }
  }
}

const main = async () => {
  console.log(`Base: ${BASE}`);

  const salud = await fetch(`${BASE}/health`).then((r) => r.json());
  console.log(`Salud: ${salud.status} (${salud.timestamp})`);

  // ---- 1. mis-viajes: duracion_real y alertas_count ----
  const viajes = await get("/api/viajes/mis-viajes");
  if (viajes.status !== 200) {
    console.log(`\n${bad(`mis-viajes devolvió ${viajes.status}`)} ${JSON.stringify(viajes.body)}`);
    if (viajes.status === 401) console.log("El token venció o es inválido. Sacá uno nuevo.");
    process.exit(1);
  }
  const lista = viajes.body;
  console.log(`\n${lista.length} viajes en el historial.`);

  const finalizado = lista.find((v) => v.estado === "FINALIZADO");
  reportar(
    `GET /api/viajes/mis-viajes  ${dim(`(viaje ${finalizado?.id_viaje ?? "—"}, FINALIZADO)`)}`,
    finalizado,
    { duracion_real: true, precio_real: true, puntualidad_inicio: false, fecha_inicio: false },
  );
  if (finalizado && typeof finalizado.duracion_real === "number" && finalizado.duracion_real > 1000) {
    console.log(`  ${warn("OJO")}   duracion_real = ${finalizado.duracion_real}: si eso son minutos, son ${(finalizado.duracion_real / 60).toFixed(1)} h. ¿Seguro no vino en segundos?`);
  }
  const conAlertas = lista.some((v) => "alertas_count" in v);
  console.log(`  ${conAlertas ? ok("OK   ") : warn("FALTA")}  alertas_count ${dim("— pendiente conocido, el filtro \"Con alertas\" depende de esto")}`);

  // ---- 2. detalle: duracion_estimada y vehiculo ----
  const objetivo = lista.find((v) => v.id_conductor != null) ?? finalizado ?? lista[0];
  if (objetivo) {
    const det = await get(`/api/viajes/${objetivo.id_viaje}`);
    if (det.status === 200) {
      reportar(
        `GET /api/viajes/${objetivo.id_viaje}  ${dim(`(${det.body.estado})`)}`,
        det.body,
        { duracion_estimada: true, duracion_estimada_horas: true, vehiculo: false, ruta_planeada: false, empresa: false },
      );
      const d = det.body.duracion_estimada, h = det.body.duracion_estimada_horas;
      if (typeof d === "number" && typeof h === "number") {
        const esperado = Math.round(h * 60);
        console.log(
          d === esperado
            ? `  ${ok("OK   ")}  unidades coherentes: ${d} min = round(${h} h × 60)`
            : `  ${bad("MAL  ")}  duracion_estimada=${d} pero round(${h}×60)=${esperado}`,
        );
        if (d !== esperado) fallos++;
      }
    } else {
      console.log(`\n${bad(`GET /api/viajes/${objetivo.id_viaje} devolvió ${det.status}`)}`);
      fallos++;
    }
  }

  // ---- 3. remito ----
  if (finalizado) {
    const rem = await get(`/api/viajes/${finalizado.id_viaje}/remito`);
    console.log(
      `\nGET /api/viajes/${finalizado.id_viaje}/remito → ${rem.status === 200 ? ok(rem.status) : bad(rem.status)} ${dim(JSON.stringify(rem.body).slice(0, 90))}`,
    );
    if (rem.status !== 200) fallos++;
    const tieneFoto = JSON.stringify(rem.body ?? {}).match(/foto|imagen|photo/i);
    console.log(`  ${tieneFoto ? ok("hay algo tipo foto") : warn("sin foto del remito conformado — pendiente D5")}`);
  }

  // ---- 4. empresa (solo si sos GERENTE) ----
  if (EMPRESA) {
    const ve = await get(`/api/empresas/${EMPRESA}/viajes`);
    if (ve.status === 200 && ve.body.length) {
      reportar(
        `GET /api/empresas/${EMPRESA}/viajes  ${dim(`(${ve.body.length} viajes, muestro el primero)`)}`,
        ve.body[0],
        { fecha_reserva: false, id_vehiculo: false, precio_real: false, duracion_estimada_horas: true, condiciones_req: true, vehiculo: false, cliente: true, conductor: false },
      );
      const conVeh = ve.body.find((v) => v.vehiculo);
      if (conVeh) {
        console.log(
          conVeh.vehiculo.condiciones
            ? `  ${ok("OK   ")}  vehiculo.condiciones viene expandido (filtra la flota sin pedirla aparte)`
            : `  ${bad("FALTA")}  vehiculo.condiciones`,
        );
        if (!conVeh.vehiculo.condiciones) fallos++;
      }
      const enCurso = ve.body.find((v) =>
        ["EN_CAMINO_A_ORIGEN", "CARGANDO", "EN_RUTA", "DESCARGANDO"].includes(v.estado));
      if (enCurso) {
        const ca = await get(`/api/viajes/${enCurso.id_viaje}/costo-acumulado`);
        console.log(`\nGET /api/viajes/${enCurso.id_viaje}/costo-acumulado (como GERENTE) → ${ca.status === 200 ? ok(ca.status) : bad(ca.status)} ${dim(JSON.stringify(ca.body).slice(0, 80))}`);
        if (ca.status !== 200) fallos++;
      } else {
        console.log(`\n${dim("Sin viajes en curso: no se pudo probar costo-acumulado como gerente.")}`);
      }
    } else {
      console.log(`\n${bad(`GET /api/empresas/${EMPRESA}/viajes → ${ve.status}`)} ${dim(JSON.stringify(ve.body).slice(0, 80))}`);
      fallos++;
    }
  } else {
    console.log(`\n${dim("FLETER_EMPRESA no seteada: se saltean los chequeos de gerente.")}`);
  }

  console.log(
    fallos === 0
      ? `\n${ok("Sin diferencias contra el contrato.")}`
      : `\n${bad(`${fallos} diferencia(s) contra el contrato.`)} Revisá las líneas marcadas.`,
  );
  process.exit(fallos === 0 ? 0 : 1);
};

main().catch((e) => {
  console.error(bad("Error corriendo el script:"), e.message);
  process.exit(1);
});
