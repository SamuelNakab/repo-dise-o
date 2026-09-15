# OPEN.md — Decisiones de producto

> **Si una tarea toca algo marcado ABIERTA, no se implementa. Se para y se pregunta.**

Este es el primer archivo que se lee en cada sesión, antes que `CLAUDE.md`.
Creado el **12-08-2026**, actualizado el **19-08-2026**.

Una decisión CERRADA se puede implementar. Una ABIERTA no: falta un dato que no
está en el repo y que sale de clientes o de facturas reales. Escribir código
contra una decisión ABIERTA es escribir código que hay que tirar.

---

## D1 — SEGMENTO · ABIERTA

PyME industrial de AMBA con fleteros propios habituales.

**Falta:** el filtro operable definitivo — viajes/semana, tipo de carga, condición
de pago.

---

## D2 — CONVENCIÓN DE PRECIO · ABIERTA

Se mantienen **CABA por hora** y **PROVINCIA por km**. Se suman unidades
industriales: **por viaje contratado, por palet, por tonelada**.

Precio **fijo al confirmar**, con banda de **±15 %**; el desvío lo absorbe la
plataforma.

**Falta:** los números reales. Salen de facturas de clientes.

**Además falta trabajo del backend, y no depende de tener los números** (19-08).
Para cobrar por palet o por tonelada hay que **pedir** el palet y la tonelada, y hoy
no se piden en ningún lado: no están en el formulario de pedido, ni en el contrato
de la API, ni en el modelo. Lo único que describe la carga es `descripcion`, texto
libre que el contrato declara inerte (no afecta matching ni costo) y que el
formulario ni siquiera expone.

Para que D2 sea implementable, el backend tiene que agregar:

- `peso_kg` y `cantidad_pallets` (o la unidad que se elija) en `POST /api/viajes`,
  en `GET /api/viajes/:id` y en el remito;
- **capacidad del vehículo**, que tampoco existe: hoy un vehículo se describe por
  marca y color, sin kg máximos, m³, largo de caja ni pallets. Sin eso no se puede
  validar que el vehículo asignado entre la carga.

**Esto se le pide al backend ya**, aunque las tarifas todavía no estén: son dos
trabajos independientes y el de los campos es el que tiene lead time. Registrado
también en `context/tasks/pendiente.md`.

---

## D3 — COBRO · ABIERTA

**Cuenta corriente con transferencia bancaria**, no tarjeta por viaje.
MercadoPago queda **en cuestión** como medio principal.
La **liquidación unificada mensual** entra al MVP.

**Falta:** confirmar con clientes.

**15-09 — pantalla de Facturación sin decidir D3.** Se habilitó `/facturacion` como
**lista de comprobantes por mes**: viajes finalizados, precio final y remito PDF,
con un **total del mes rotulado "informativo, no es una liquidación ni una
factura"**. No hay saldo, cuenta corriente, vencimientos ni factura. Cuando D3
cierre, la liquidación la calcula el backend y esta pantalla la muestra; el total
informativo se reemplaza por ese número o se saca.

---

## D4 — POOL PRIVADO · CERRADA

Tres niveles:

1. **Flota propia del cliente** — core del MVP.
2. **Pool homologado por Fleter** — después.
3. **Marketplace abierto** — descartado.

Asignación **directa**, no "primero en aceptar".
Fee **fijo por viaje administrado** en el nivel 1; **porcentaje solo en el nivel 2**.

### ⚠️ PENDIENTE URGENTE — el código construido contradice esta decisión

Decidido el 19-08: **D4 se aplica, pero no todavía.** Hay pedidos al backend
atrasados que van primero. Queda anotado acá para que nadie lo "descubra" de nuevo
ni siga construyendo encima.

**Qué contradice qué.** El fix del backend de agosto entregó
`GET /api/empresas/:id/viajes-disponibles`: un pull del **mercado abierto** de
viajes que ninguna empresa tomó todavía, para que cualquier gerente elegible los
reserve. Eso es el **nivel 3, el que D4 descartó**. Y el flujo del conductor
(`app/(conductor)/conductor/page.tsx`) es literalmente *primero en aceptar*, con
manejo de race condition incluido — exactamente lo que D4 dice que no.

Se integró el 12-08, antes de que D4 estuviera escrita. No fue un error de lectura:
la decisión todavía no existía.

**Qué código está en juego** (todo pusheado y corriendo contra mocks):

- `app/(gerente)/gerente/page.tsx` — la pantalla **es** el mercado abierto.
- El ciclo `reservar` → `cancelar-reserva` → timeout, y el estado
  `RESERVADO_POR_EMPRESA`: sólo tienen sentido si varias empresas compiten por el
  mismo viaje. Con asignación directa no hay contra quién competir.
- El evento socket `viaje:disponible` hacia gerentes y la regla de elegibilidad por
  flota.
- Del lado del conductor: `GET /api/viajes/disponibles` y `viaje:aceptar`.

**La pregunta a contestar cuando se retome:** ¿el mercado abierto sobrevive como
mecanismo *entre empresas* (aunque no sea un marketplace de cara al cliente), o el
panel del gerente pasa a mostrar únicamente los viajes que su propio cliente le
asignó directo? En el segundo caso se cae buena parte de lo listado arriba.

**Mientras tanto:** no construir más sobre el mercado abierto. Si una tarea nueva
toca `viajes-disponibles`, `reservar` o `viaje:aceptar`, parar y preguntar.

**15-09 — se preguntó y se decidió:** la pantalla "Viajes disponibles" del
conductor (`app/(conductor)/conductor/page.tsx`) se **rediseñó sólo en lo visual**
(cards, mapa del recorrido, mensaje cuando la lista está vacía). El flujo
primero-en-aceptar, `GET /api/viajes/disponibles` y `viaje:aceptar` quedaron
**intactos**: no se agregó comportamiento nuevo sobre el mercado abierto.

### El contrato del 19-08 profundiza el conflicto

La entrega nueva del backend agrega una **cuarta vía de acceso** a
`GET /api/viajes/:id`: un `GERENTE` cuya empresa tiene al menos un vehículo que
cumple todas las `condiciones_req` puede abrir el detalle de un viaje en
`BUSCANDO_CONDUCTOR` — o sea, de un viaje que **no es de su empresa y que nadie
reservó todavía**. El criterio es el mismo que decide a qué gerentes les llega el
push `viaje:disponible`: si te llegó el push, podés abrir el detalle.

Resuelve un pendiente real que le habíamos pasado (el gerente decidía la reserva
sin poder ver la `ruta_planeada`), pero lo resuelve **construyendo más
marketplace abierto**, que es justo el nivel 3 que D4 descartó.

**Decisión del 19-08: no se consume.** El tipo `ViajeDetalleGerente` está listo,
y `app/(gerente)/gerente/viajes/[id]/page.tsx:32` ya llama al endpoint como
best-effort (`.catch(() => null)`), así que si D4 se resuelve a favor del mercado
abierto empieza a funcionar solo, sin tocar código. Si se resuelve en contra, esa
llamada se borra. En ninguno de los dos casos hace falta escribir nada ahora.

Esto también significa que el backend está invirtiendo en una superficie que
puede caerse entera. **Conviene avisarle antes de que siga.**

---

## D5 — CIERRE DEL VIAJE · CERRADA

**Sale el QR.** Incompatibilidad de mercado: Argentina opera con remito en papel.

**Entra:** foto del remito conformado + geolocalización + timestamp + validación
de GPS en radio del destino, generando un **comprobante PDF**.

**Estado al 19-08, verificado contra el contrato nuevo.** El backend sacó el QR:
se eliminó `GET /api/viajes/:id/qr-paradas` y el campo `qr_firmado` del body.
`POST /api/viajes/:id/confirmar-parada` ahora recibe `{ id_parada, lat, lng }` y
valida proximidad. Las tres preguntas que estaban acá:

1. **Qué dispara el cierre — RESPONDIDA.** Confirmar la última parada pendiente
   pasa el viaje a `FINALIZADO` y emite `viaje:finalizado` **con el mismo
   payload de antes**. La pantalla de viaje activo (`hooks/useViajeActivo.ts`)
   no se rompe. Verificado leyendo el contrato, no probado contra staging.
2. **El radio — RESPONDIDA, pero la decidió el backend.** Es
   `RADIO_CONFIRMACION_METROS`, variable de entorno con **default 50 m** (antes
   estaba fijo en 200: se bajó porque con el QR la proximidad era un control
   secundario y ahora es el único). Fuera del radio devuelve `400` y **bloquea la
   entrega**: no se registra con alerta ni se cierra igual.

   Esto estaba marcado acá como decisión de producto sin tomar, y se tomó del
   lado del backend sin preguntar. **Conviene ratificarlo**: 50 m es agresivo
   para GPS urbano entre edificios altos, y el modo de falla es un conductor que
   está parado en la puerta y no puede cerrar la entrega. El contrato dice que
   por eso la dejaron configurable sin redeploy.
3. **El comprobante PDF — SIN RESPUESTA, y falta lo principal.**

**⚠️ La foto del remito conformado no existe en el contrato nuevo.** Busqué
`foto`, `imagen`, `comprobante`, `upload`, `multipart` y `storage`: cero
apariciones. `remito_url` sigue siendo el mismo PDF autogenerado de siempre.

Es decir: de "foto del remito conformado + geolocalización + timestamp +
validación de GPS" se implementaron los últimos tres, y **falta el primero**, que
es el núcleo de la decisión y el diferencial de producto. Sin la foto, sacar el
QR no agrega prueba de entrega — sólo la quita.

El front web no sube la foto (eso es la app del conductor), pero sí tendría que
mostrarla en el detalle del viaje. **Va primero en la lista de pedidos al
backend** (`context/tasks/pendiente.md`).

---

## D6 — CAPA DE CÁLCULO (BFF) · ABIERTA

*Abierta el 19-08.*

La regla vieja del proyecto decía que **el frontend nunca calcula nada**: sólo pide
datos al backend y los muestra. Hoy no se cumple:
`app/api/analytics/cliente/resumen/route.ts:124-156` calcula total gastado, costo
promedio, flete más caro y más barato, conteo por zona, suma de alertas y top de
destinos; los gráficos se arman en `:68-94`.

**Posición actual y por qué se decidió así:** no es cálculo "front-front". Es un
**BFF** — un Route Handler que corre en el servidor de Next, al que **el cliente no
tiene acceso**: el browser recibe el resultado, nunca los viajes crudos ni la
lógica. Son además cálculos bastante específicos de esa pantalla, que no tendría
mucho sentido empujar al backend como endpoint propio.

**Por qué queda ABIERTA igual:** la objeción se considera bien planteada y conviene
resolverla antes de que haya plata de por medio. Dos cosas concretas:

- **D3 trae liquidación mensual.** Si los totales los suma el BFF, un redondeo mal
  hecho es una factura mal emitida. Habría que decidir explícitamente que la
  liquidación **no** pasa por esta capa, aunque el analytics sí.
- **Ya hay una discrepancia semántica en producción:** `por_zona` devuelve
  **cantidad de viajes** y la pantalla sugiere pesos. Es la clase de error que se
  cuela cuando el que agrega no es el dueño del dato.

**Qué falta decidir:** dónde queda el límite. Propuesta a discutir — el BFF puede
**agregar y formatear** para pantalla, pero cualquier número que termine en un
documento con valor comercial (factura, liquidación, comprobante) lo calcula el
backend y el front lo muestra tal cual.

Hasta que cierre: **no agregar cálculo nuevo en el BFF sin preguntar.**

### Autorización del 15-09 — cálculo de pantalla

Se autorizó explícitamente ampliar el BFF con **cálculo de pantalla** para
reordenar el Analytics de la PyME: serie del gráfico por día/semana/mes (antes
metía todos los viajes en una sola barra), período anterior y variación %, tasa
de cancelación, duración promedio, puntualidad y gasto por zona en pesos. Vive en
`lib/analytics-cliente.ts` (módulo puro, con tests) y lo expone
`app/api/analytics/cliente/resumen/route.ts`. El "total del mes" de Facturación
también es de este tipo y está rotulado como informativo.

**Lo que no cambia:** el límite propuesto sigue en pie. Ningún número que termine
en un documento con valor comercial (factura, liquidación, comprobante) se calcula
en el BFF. D6 sigue ABIERTA para eso.
