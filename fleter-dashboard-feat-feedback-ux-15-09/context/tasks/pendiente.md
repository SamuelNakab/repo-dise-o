# Pendientes de datos para el dashboard

> Revisado el **19-08-2026** contra la entrega nueva del backend. Antes de tomar
> algo de acá, leer `OPEN.md`: varios de estos huecos dependen de decisiones
> ABIERTAS (D2 precio, D3 cobro) y no se implementan hasta que cierren.
>
> **Resueltos por la entrega del 19-08** (ya integrados en el front): acceso del
> gerente a `costo-acumulado` y `remito`, schema documentado de
> `GET /api/empresas/:id/viajes`, `duracion_real` en `mis-viajes`,
> `duracion_estimada` y `vehiculo` en el detalle, y `tiempo_capital` /
> `distancia_provincia` en `desglose_estimado` y en `viaje:finalizado`.

Estas secciones muestran placeholders porque la API/backend aún no provee los datos
necesarios. **Este archivo es la lista para pasarle al backend**: cada ítem dice qué
falta, dónde se nota en el front y qué habría que agregar.

---

## ⚠️ Auth de staging caída — bloquea toda verificación (19-08)

> Estado al cierre del 19-08. Detalle en `ESTADO-REAL.md` → "Intento de
> verificación contra staging" y el pedido armado en `PEDIDO-BACKEND-19-08.md`.

- **Se acabó el uso de Neon.** Es la causa raíz más probable del `500` en
  `registro-cliente` y del `401` en `/api/auth/me`. **Sin confirmar**: no se
  chequeó el estado de Neon ni los logs de Railway.
- **Primer paso al retomar:** confirmar que la base está arriba y reintentar el
  login. Buena parte de esto puede desaparecer solo.
- Quedan en pie **dos bugs que la caída sólo expuso, no causó** — ver las dos
  secciones que siguen. No se cierran cuando vuelva Neon.
- **Consecuencia:** nada de la entrega del 19-08 está verificado contra el
  backend real. Todo el front sigue probado sólo contra mocks.

---

## El registro de usuarios no es atómico — deja cuentas huérfanas

> **No es un problema de Neon.** La caída de la base lo hizo visible, pero el bug
> es la falta de rollback y vuelve cada vez que la escritura falle por cualquier
> motivo: un timeout, un deploy a mitad de request, una constraint violada.
> **No cerrar este ítem cuando vuelva la base.**

- **Qué pasa:** `POST /api/auth/registro-cliente` (y presumiblemente
  `registro-conductor` y `registro-gerente`, mismo patrón) hace dos escrituras en
  dos sistemas distintos:
  1. crea el usuario en Firebase
  2. inserta la fila en la DB

  Si (2) falla, **(1) ya ocurrió y no se deshace**. Queda un usuario que existe en
  Firebase y no en la DB.

- **Por qué es grave, y no sólo feo:** esa cuenta queda en un estado sin salida.
  - **Entrar** falla: Firebase la autentica, pero el backend no la reconoce.
  - **Registrarse de nuevo** falla con `409 "El email ya esta registrado"` — el
    contrato aclara que ese `409` es por duplicado **en Firebase**.

  El email queda quemado de forma permanente. El usuario no tiene ninguna acción
  disponible para recuperarse, y desde el front no hay nada que se pueda hacer:
  no existe endpoint para limpiar el huérfano.

- **Observado el 19-08:** `registro-cliente` devolvió `500` y los reintentos
  pasaron a devolver `409` indefinidamente. Es exactamente esta secuencia.

- **Qué haría falta:**
  1. **Rollback:** si falla la escritura en la DB, borrar el usuario recién creado
     en Firebase (`deleteUser`) antes de responder el error. Alternativa más
     robusta: escribir primero en la DB y crear en Firebase al final.
  2. **Limpiar los huérfanos que ya existen** en staging (y chequear producción).
  3. Que el `409` distinga el caso "existe en Firebase pero no en la DB" del
     "email realmente ya registrado", para poder dar un mensaje útil en vez de
     dejar al usuario golpeando una puerta cerrada.

---

## `login` y `me` devuelven 401 donde el contrato dice 404

> Tampoco se cierra cuando vuelva Neon: es el código de estado equivocado para un
> caso que el contrato documenta explícitamente.

- **Qué pasa:** con un token de Firebase **válido** y sin fila en la DB,
  `POST /api/auth/login` y `GET /api/auth/me` responden `401`.
- **Qué dice el contrato:** ese caso es `404 "Usuario no registrado"`. El `401`
  está documentado sólo para `"Token no proporcionado"` y
  `"Token invalido o expirado"`.
- **Por qué importa:** el `401` hace que un **usuario faltante** parezca un
  **problema de token**, y manda a debuggear al lado equivocado. Es literalmente
  lo que pasó el 19-08: se perdió tiempo buscando un cruce de proyectos de
  Firebase cuando el token estaba perfecto.
- **Impacto en el front:** con el `404` documentado se puede mandar al usuario a
  completar el registro. Con el `401` no se puede distinguir de una sesión vencida,
  así que la única reacción posible es tirarlo al login — donde va a entrar de
  nuevo y volver a fallar.

---

## ⚠️ La foto del remito conformado — lo más urgente (19-08)

> Bloquea **D5**, que está CERRADA. Ver `OPEN.md` → D5.

- **Qué falta:** la entrega del 19-08 eliminó el QR (`GET /api/viajes/:id/qr-paradas` y el
  campo `qr_firmado`) y lo reemplazó por confirmación por proximidad GPS
  (`POST /api/viajes/:id/confirmar-parada` con `{ id_parada, lat, lng }`,
  radio `RADIO_CONFIRMACION_METROS`, default 50 m). Pero **no se implementó la foto**.
  Busqué `foto`, `imagen`, `comprobante`, `upload`, `multipart` y `storage` en el contrato:
  cero apariciones. `remito_url` sigue siendo el PDF autogenerado de siempre.
- **Por qué importa:** D5 define el cierre como "foto del remito conformado +
  geolocalización + timestamp + validación de GPS". Se hicieron los últimos tres. Sin la foto,
  sacar el QR **no agrega prueba de entrega, sólo la quita**: antes el token firmado probaba
  la presencia, ahora el único control es una coordenada que el cliente de la app manda.
- **Qué haría falta:** subida de la foto en `confirmar-parada` (multipart o URL prefirmada),
  persistirla por parada, y exponerla en `GET /api/viajes/:id` y en el remito para que el
  cliente la vea.
- **Dónde impacta el front web:** el dashboard no sube la foto (eso es la app del conductor),
  pero tiene que mostrarla en el detalle del viaje y en el remito.

### Ratificar el radio de 50 m
- Fuera del radio el backend devuelve `400` y **bloquea la entrega** — no la registra con
  alerta. Es una decisión de producto que `OPEN.md` tenía marcada como abierta y que se tomó
  del lado del backend. 50 m es agresivo para GPS urbano entre edificios altos; el modo de
  falla es un conductor parado en la puerta que no puede cerrar. Confirmar que es lo deseado.

---

## Analytics

> **15-09:** `/api/analytics/cliente/resumen` es **nuestro BFF**, no un endpoint del
> backend (este archivo lo trataba como pedido al backend). Con la autorización de
> cálculo de pantalla (`OPEN.md` → D6) se resolvieron en el front: período anterior
> y variación, ruta de los extremos y gasto por zona en pesos
> (`lib/analytics-cliente.ts`). Queda un único hueco que sí es del backend:

### Alertas por viaje
- **Qué falta:** `alertas_count` y `alertas_por_tipo` en cada viaje de `mis-viajes`
  (ver "Creación de viaje" más abajo).
- **Dónde:** card "Servicio" del Analytics (hoy dice que el backend no informa el
  conteo) y filtro "Con alertas" del Record. "Revisar último alertado" se deriva de
  esto cuando llegue.

---

## Creación de viaje

### ~~`zona` hardcodeada a `"CABA"`~~ — RESUELTO
- El backend deriva la `zona` de las coordenadas de las paradas (polígono oficial de CABA,
  `booleanPointInPolygon`). El campo `zona` del body **se acepta pero se descarta**.
- El front ya no lo manda y muestra la zona que devuelve el backend al crear el viaje.

### ~~`duracion_real` en `GET /api/viajes/mis-viajes`~~ — RESUELTO (19-08)
- Viene en **minutos enteros**. Es `null` si el viaje no está `FINALIZADO` o nunca arrancó.
- Se calcula al leer (`max(fecha_entrega) − fecha_inicio`), no es columna. Toma el **máximo**
  de las `fecha_entrega` y no la parada de mayor `orden`, porque el orden de confirmación
  entre paradas no se valida.

### `alertas_count` sigue sin venir en `GET /api/viajes/mis-viajes`
- **Qué falta:** el historial tiene un filtro "Con alertas" que usa `alertas_count`, y el
  resumen de analytics lo suma. La entrega del 19-08 no lo agregó.
- **Dónde:** `app/(cliente)/viajes/page.tsx:132` (filtro) y
  `app/api/analytics/cliente/resumen/route.ts:142`.
- **Estado:** no rompe — tipado opcional con fallback (`?? 0`), así que **el filtro "Con
  alertas" simplemente no devuelve nada**. Es un filtro muerto en la UI.
- **Solución futura:** agregar `alertas_count` al response de `mis-viajes`.

---

## Gerente (estructura jerárquica) — RESUELTO (19-08)

> Los tres gaps que quedaban acá los cerró la entrega del 19-08:
>
> - **`costo-acumulado` y `remito`**: ahora aplican la misma regla de acceso que
>   `GET /api/viajes/:id` (helper `puedeVerViaje`), así que el gerente de la empresa dueña
>   ve el costo en vivo y descarga el remito. Ya integrado en
>   `app/(gerente)/gerente/viajes/[id]/page.tsx`.
> - **Detalle de un viaje del mercado abierto**: resuelto con una cuarta vía de acceso para
>   gerentes con flota elegible sobre viajes en `BUSCANDO_CONDUCTOR`. **No se consume** —
>   ver `OPEN.md` → D4, que congeló esa superficie.
> - **`GET /api/empresas/:id/viajes`**: documentado con el JSON completo. `fecha_reserva`,
>   `id_vehiculo` y `precio_real` dejaron de estar inferidos y `lib/types-empresa.ts` ya
>   refleja el schema real.
>
> **Sigue NO VERIFICADO contra el backend.** Todo el panel de gerente corre contra
> `lib/mocks-gerente.ts`: que el mock responda no prueba que el endpoint exista. Para pasar a
> VERIFICADO hay que correr con `NEXT_PUBLIC_MOCK=false` contra staging.

---

## Inconsistencias del contrato (no bloquean, pero conviene confirmar)

### ~~`viaje:finalizado` y `desglose_estimado` no muestran las magnitudes facturadas~~ — RESUELTO (19-08)
- `tiempo_capital` y `distancia_provincia` ahora sí figuran en los ejemplos de
  `desglose_estimado` (`POST /api/viajes`) y del evento `viaje:finalizado`.
- El desglose de `viaje:finalizado` **no** incluye `fraccion_caba` ni `es_hora_pico`; el de la
  estimación sí. Ya está tipado así en `hooks/useViajeActivo.ts`.
- `desglose_estimado` de `POST /api/viajes` y `desglose` de `POST /api/viajes/estimar-costo`
  son **el mismo objeto con dos nombres**. No se unificaron porque el front consume ambos.

---

## Datos de la carga y del vehículo — bloquean D2 (19-08)

> Prioritario. No depende de que estén las tarifas: son dos trabajos independientes
> y este es el que tiene lead time. Ver `OPEN.md` → **D2**.

### La carga no se modela en ningún lado
- **Qué falta:** para cobrar **por palet o por tonelada** hay que pedir el palet y la
  tonelada, y hoy no se piden. No hay `peso_kg`, ni volumen, ni cantidad de bultos,
  ni valor declarado — ni en `POST /api/viajes`, ni en `GET /api/viajes/:id`, ni en
  el modelo. Lo único que describe la carga es `descripcion`, texto libre que el
  propio contrato declara inerte ("no afecta matching ni costo") y que el formulario
  ni siquiera expone.
- **Solución futura:** agregar `peso_kg` y `cantidad_pallets` (o la unidad que se
  elija en D2) al alta del viaje, al detalle y al remito.

### El vehículo no declara capacidad
- **Qué falta:** un vehículo se describe por `patente`, `marca`, `modelo`, `anio`,
  `color`, `tipo_vehiculo` y `condiciones[]`. **No hay kg máximos, ni m³, ni largo de
  caja, ni pallets.** Se lo describe por marca y color, no por lo que puede
  transportar.
- **Consecuencia:** no se puede validar que el vehículo asignado entre la carga, ni
  cotizar por capacidad. Hoy la elegibilidad se resuelve sólo con las
  `condiciones_req`.
- **Solución futura:** agregar capacidad al vehículo y usarla en la elegibilidad.

---

## Conductor y vehículos (15-09)

> Salen del feedback del 15-09. Pedidos en `PEDIDO-BACKEND-19-08.md` → H, I.

### Foto del vehículo
- **Qué falta:** campo de imagen y subida en `mis-vehiculos` (no existe en el contrato).
- **Dónde:** `components/conductor/VehiculoForm.tsx` tiene el selector con preview,
  marcado "Próximamente" y **sin enviar**. Las cards de `mis-vehiculos` muestran un
  ícono genérico, no la foto elegida.
- **Solución futura:** subida a R2 + `foto_url` en `mis-vehiculos` y en el `vehiculo`
  del detalle del viaje.

### Distancia planificada
- **Qué falta:** `distancia_estimada_km` en los GET de viaje. Hoy sólo viene al crear
  el viaje (`POST /api/viajes` → `desglose_estimado.distancia_km`).
- **Dónde:** km en las cards y el detalle del conductor y en el detalle del cliente.
- **Placeholder actual:** se mide la ruta dibujada con Google
  (`components/MapaRutaCanvas.tsx`). Puede diferir de la que usó el backend.

### Ganancia neta del conductor
- **Qué falta:** ganancia o fee aplicado por viaje en `disponibles` y
  `mis-viajes-conductor`.
- **Placeholder actual:** se muestra `precio_estimado`/`precio_real` rotulado
  "Tarifa del viaje · antes de la comisión de Fleter". **No es la ganancia real**;
  cuando llegue el dato, el número baja.

---

## Detail (viaje individual)

### Km recorridos y alertas (15-09)
- **Qué falta:** `km_reales` y `alertas[]` en `GET /api/viajes/:id`. La página los lee
  desde antes pero **no están en el contrato**: contra el backend real siempre
  mostraba "—" y "Sin alertas", que es peor que no mostrar nada.
- **Estado actual:** el detalle muestra "El backend todavía no los informa" en lugar de
  un falso "Sin alertas". Pedido en `PEDIDO-BACKEND-19-08.md` → J.

### ~~Duración estimada~~ — RESUELTO (19-08)
- `GET /api/viajes/:id` devuelve `duracion_estimada` en **minutos enteros** y
  `duracion_estimada_horas` en **horas float**. La card "Tiempo del viaje" ya compara
  estimado vs. real.
- **Cuidado con las unidades:** todo `duracion_*` sin sufijo va en minutos enteros; todo
  `tiempo_*` y `*_horas` va en horas float. `GET /api/empresas/:id/viajes` devuelve la fila
  cruda, así que ahí sólo está `duracion_estimada_horas`.

### Vehículo en el detalle — RESUELTO PARCIAL (19-08)
- **Ya viene:** `id_vehiculo`, `patente`, `marca`, `modelo`, `anio`, `color`, `tipo_vehiculo`.
  Es `null` mientras no haya conductor asignado, y la clave siempre está presente. Ya integrado
  en `app/(cliente)/viajes/[id]/page.tsx`.
- **Falta todavía:** `condiciones[]` y `credenciales[]` del vehículo en el detalle del cliente.
  El gerente sí las recibe por `GET /api/empresas/:id/viajes`, el cliente no.
- **Falta también la capacidad** (kg, m³, pallets) — ver la sección que bloquea D2.

### Ayudante
- **Qué falta:** No hay datos de ayudante en el response.
- **Dónde:** Card "Chofer y equipo" — sección del ayudante.
- **Solución futura:** Agregar `ayudante: { nombre, rol } | null` al detalle.

### Transacciones
- **Qué falta:** No existe endpoint de historial de cobros por viaje.
- **Dónde:** Card "Resumen de cobro" actualmente muestra estimado vs final manual. Eventualmente debería ser una lista de transacciones reales.
- **Solución futura:** Endpoint o campo `transacciones: [{ tipo, monto, fecha, motivo }]` en el detalle del viaje.

### Carga (descripción y peso)
- **Qué falta:** El detalle no incluye datos de la carga (`descripcion`, `peso_kg`).
- **Dónde:** KV grid en card "Tiempo del viaje".
- **Solución futura:** Agregar `carga: { descripcion: string, peso_kg: number }` al detalle.

---

## General

### ~~Zona en `por_zona` como montos ARS~~ — RESUELTO en el BFF (15-09)
- El resumen devuelve `gasto_por_zona` en pesos (finalizados) además de `por_zona`
  (cantidad). La card "Gasto por zona" muestra las dos cosas rotuladas.
