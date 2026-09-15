# ESTADO-REAL.md

Auditoría del repo `fleter-dashboard` y sus `.md` de contexto. Original del
2026-08-10; **revisada el 2026-08-19**. Rama `main` con árbol sucio y **sin
commitear**. Este repo es **solo el frontend web** (Next.js): no hay backend, ni
schema de Prisma, ni servicio de pricing. Todo lo que se afirma sobre el backend
sale de los `.md` de contrato, **no de código verificable acá**.

## Qué cambió desde la auditoría original (10 → 19 de agosto)

Tres tandas de trabajo, todas sobre el árbol sucio:

1. **Integración del fix del backend** (contrato de agosto). Se cobraron
   `GET /api/empresas/:id/viajes-disponibles`, `condiciones_req` en los viajes de
   empresa y el acceso del gerente a `GET /api/viajes/:id`. Se arregló un bug de
   reserva: los push por socket se insertaban arriba de la lista y corrían el botón
   bajo el cursor (`app/(gerente)/gerente/page.tsx`, `ordenarPorFecha`).
2. **Segunda lectura del contrato**, que traía más que los tres cambios de gerente:
   la `zona` ahora la calcula el servidor, y el arranque del viaje pasó a un endpoint
   propio. Ver las filas nuevas de la tabla de abajo.
3. **Pase de documentación** (12-08): se creó `OPEN.md` con las decisiones D1-D5, se
   reescribió `CLAUDE.md`, se movió el material académico a `docs/academico/` y se
   generó `docs/PROPUESTA-CONTRATO.md`. La sección 4 de este archivo quedó en buena
   parte saldada por eso — está marcada ítem por ítem.
4. **Entrega nueva del backend** (19-08, 484 inserciones reales en el contrato).
   **Se eliminó el flujo de QR** y el cierre pasó a confirmación por proximidad GPS.
   Se cobraron siete pendientes: acceso del gerente a `costo-acumulado` y `remito`,
   schema documentado de `GET /api/empresas/:id/viajes`, `duracion_real` en
   `mis-viajes`, `duracion_estimada` y `vehiculo` en el detalle, y
   `tiempo_capital`/`distancia_provincia` en el desglose. Se arreglaron dos bugs
   propios: `getMinFecha()` construía el mínimo del `datetime-local` en UTC en vez
   de hora local (en UTC-3 corría el mínimo tres horas de más), y `lib/api.ts`
   descartaba el status HTTP, así que el front no podía distinguir un `409` de un
   `400`. Ahora existe `ApiError` con `status`.

**Nada de esto está verificado contra el backend real.** Sigue sin haber una sola
evidencia en el repo de una corrida end-to-end contra Railway.

## Qué cambió el 15-09 (branch `feat/feedback-ux-15-09`)

Rediseño a partir de un recorrido de la app. Detalle completo, con archivos y
contratos de los BFF: **`docs/CAMBIOS-UX-15-09.md`**. Lo que cambia esta auditoría:

| Feature | Archivos | Estado |
|---|---|---|
| Landing placeholder en `/`; panel PyME movido a `/panel` | `app/page.tsx`, `lib/roles.ts`, `proxy.ts` | FUNCIONA-PROBADO en MOCK (e2e `__tests__/e2e/auth.spec.ts`) |
| Auth con layout partido, registro por perfil, conductor en 4 pasos | `components/AuthShell.tsx`, `app/(auth)/**` | EXISTE-SIN-PROBAR contra Firebase real |
| Analytics: serie por día/semana/mes, período anterior, cancelación, puntualidad, gasto por zona en $ | `lib/analytics-cliente.ts`, `app/api/analytics/cliente/resumen/route.ts`, `app/(cliente)/panel/page.tsx` | Cálculo FUNCIONA-PROBADO (unit); pantalla EXISTE-SIN-PROBAR contra backend |
| Detalle de viaje con mapa para cualquier estado | `app/(cliente)/viajes/[id]/page.tsx`, `components/MapaRuta*.tsx` | EXISTE-SIN-PROBAR. El fallback de ruta requiere **Directions API** habilitada en la key |
| "En curso" = sólo estados físicamente en curso | `lib/estados.ts` (`esEnCurso`), `ClienteShell`, `viaje-activo` | EXISTE-SIN-PROBAR |
| Facturación: comprobantes por mes + total informativo | `app/(cliente)/facturacion/page.tsx`, `lib/facturacion-cliente.ts`, `app/api/facturacion/cliente/route.ts` | Agrupado FUNCIONA-PROBADO (unit); pantalla EXISTE-SIN-PROBAR |
| Conductor: disponibles rediseñado, mis viajes por pestañas, detalle nuevo, alta de vehículo compartida | `app/(conductor)/**`, `components/conductor/**` | EXISTE-SIN-PROBAR |
| Conductor: escucha `error` y `viaje:reservado` del socket (bugs) | `app/(conductor)/conductor/page.tsx` | EXISTE-SIN-PROBAR contra backend |

Correcciones a filas de abajo: la fila "Remito PDF" apunta a un archivo que cambió
de forma; la de "Dashboard web analítico" ya no usa `MOCK_RESUMEN_BASE` (los KPIs
MOCK ahora se mueven con el período). La afirmación de la sección 5 "Al mover el
selector de período los KPIs no se mueven" dejó de ser cierta.

---

## 1. Qué corre de verdad

`FUNCIONA-PROBADO` exige un test automatizado o evidencia de ejecución real. La
única existente es `test-results/.last-run.json` (passed) más los dos tests de
`__tests__/e2e/auth.spec.ts`, que corren en modo MOCK
(`playwright.config.ts:39-45`): sin backend, sin Firebase, sin red.

| Feature | Archivos | Estado |
|---|---|---|
| Login email/password (rama MOCK) | `hooks/useAuth.tsx:156-161`, `__tests__/e2e/auth.spec.ts:7-23` | FUNCIONA-PROBADO (solo MOCK: no valida credenciales, escribe `token=mock` a mano) |
| Login email/password (rama real Firebase) | `hooks/useAuth.tsx:162-170`, `lib/firebase.ts` | EXISTE-SIN-PROBAR |
| Login con Google | `hooks/useAuth.tsx:172-189` | EXISTE-SIN-PROBAR |
| Registro cliente / conductor / gerente | `app/(auth)/registro/*`, `hooks/useAuth.tsx:190-243` | EXISTE-SIN-PROBAR |
| Recuperar contraseña | `app/(auth)/recuperar/page.tsx`, `hooks/useAuth.tsx:256-259` | EXISTE-SIN-PROBAR |
| Cookie httpOnly de sesión | `app/api/auth/cookie/route.ts` | EXISTE-SIN-PROBAR (usada indirectamente por el E2E en MOCK, pero el E2E setea la cookie por `document.cookie`, no por este endpoint) |
| Redirect de ruta protegida sin sesión | `proxy.ts:20-29`, `lib/auth-server.ts:71-76`, `__tests__/e2e/auth.spec.ts:25-32` | FUNCIONA-PROBADO (solo el caso "sin cookie"; el caso "rol equivocado" no tiene test) |
| Guard por rol (`requireRole`) | `lib/auth-server.ts:71-76`, los 4 `layout.tsx` de cada grupo | EXISTE-SIN-PROBAR (en MOCK el rol sale de una env var, `lib/auth-server.ts:9`) |
| Creación de viaje | `app/(cliente)/pedir-viaje/page.tsx` | EXISTE-SIN-PROBAR (`docs/academico/CALIDAD.md:132-133` lo declara explícitamente sin test) |
| Estimación de precio antes de pedir | — | NO-EXISTE. El endpoint `POST /api/viajes/estimar-costo` está documentado (`context/api-contracts/context.md:275`) y **no se llama desde ningún archivo del repo**. El cliente ve el precio recién después de crear el viaje. |
| Matching (lado cliente) | — | NO-EXISTE en el front del cliente: no escucha `viaje:conductor_asignado` en la pantalla de confirmación. (`viaje:cancelado_sin_conductor` ya no aplica: el contrato lo declaró obsoleto y el servidor no lo emite más.) |
| Arranque del viaje (evento `viaje:iniciado`) | `hooks/useViajeActivo.ts:300-325` | EXISTE-SIN-PROBAR. Agregado el 19-08. Era un agujero real: el paso `CONDUCTOR_ASIGNADO → EN_CAMINO_A_ORIGEN` dejó de emitir `viaje:estado_cambiado`, así que la pantalla de viaje activo se quedaba en "conductor asignado" con el flete ya en camino. Llega al room **personal** del cliente, no al del viaje. |
| Matching (lado conductor: aceptar viaje) | `app/(conductor)/conductor/page.tsx` | EXISTE-SIN-PROBAR |
| Matching (lado gerente: reservar/asignar/reasignar) | `app/(gerente)/gerente/page.tsx`, `app/(gerente)/gerente/viajes/[id]/page.tsx` | EXISTE-SIN-PROBAR. Además todo el panel gerente tiene un mock propio (`lib/mocks-gerente.ts`, 471 líneas) y un generador de viajes falsos cada 4 s (`app/(gerente)/gerente/page.tsx:41-63`). |
| GPS / mapa en vivo | `hooks/useViajeActivo.ts`, `components/MapaViajeActivo.tsx`, `app/(cliente)/viaje-activo/page.tsx` | EXISTE-SIN-PROBAR. En MOCK el "GPS" es una interpolación lineal Once→Quilmes cada 3 s (`hooks/useViajeActivo.ts:152-167`) y el costo sube $60 cada 5 s (`:136-150`). |
| Cierre de viaje por QR | — | NO-EXISTE. `GET /api/viajes/:id/qr-paradas` y `POST /api/viajes/:id/confirmar-parada` están en el contrato (`context/api-contracts/context.md:1747`, `:1792`) y no hay una sola referencia a "QR" en `app/`, `lib/`, `hooks/` ni `components/`. **Desde el 12-08 el QR salió del producto** (`OPEN.md` → D5, CERRADA): el cierre pasa a ser foto del remito conformado + GPS. Esos dos endpoints del contrato quedaron huérfanos. |
| Cierre de viaje (recepción del evento `viaje:finalizado`) | `hooks/useViajeActivo.ts:282-285` | EXISTE-SIN-PROBAR |
| Calificación del conductor | — | NO-EXISTE. El front **lee** `calificacion_promedio` en varias pantallas, pero no hay ningún formulario ni llamada a `POST /api/viajes/:id/calificacion`. |
| Remito PDF | `app/(cliente)/viajes/[id]/page.tsx:73-92` | EXISTE-SIN-PROBAR (abre en pestaña nueva la URL que devuelve el backend) |
| Pagos / MercadoPago | — | NO-EXISTE. Cero código, cero dependencia en `package.json`. La promesa de "MercadoPago SDK" se sacó de `CLAUDE.md` el 12-08; el medio de cobro es `OPEN.md` → **D3, ABIERTA** (cuenta corriente por transferencia, MercadoPago en cuestión). El item "Facturación" del sidebar está deshabilitado y marcado "Próx." (`components/shells/ClienteShell.tsx:122`). |
| Notificaciones (push / email / in-app persistentes) | — | NO-EXISTE. Lo único parecido es una lista en memoria de alertas de desvío/parada que se pierde al recargar (`hooks/useViajeActivo.ts:109`, `:255-273`). |
| Dashboard web analítico del cliente (rama MOCK) | `app/(cliente)/page.tsx`, `app/api/analytics/cliente/resumen/route.ts:103-110`, `__tests__/e2e/auth.spec.ts:19-22` | FUNCIONA-PROBADO parcialmente: el test verifica que aparezca el título "Analytics" y el texto "Total gastado". No verifica ningún número. |
| Dashboard web analítico (rama real, contra backend) | `app/api/analytics/cliente/resumen/route.ts:112-184` | EXISTE-SIN-PROBAR |
| Historial y detalle de viaje del cliente | `app/(cliente)/viajes/page.tsx`, `app/(cliente)/viajes/[id]/page.tsx` | EXISTE-SIN-PROBAR |
| Perfil del cliente | `app/(cliente)/perfil/page.tsx` | EXISTE-SIN-PROBAR |
| Panel de administración | `app/(admin)/**` | EXISTE-SIN-PROBAR. Está **enteramente mockeado** en `lib/api.ts:373-597`: usuarios, viajes, estadísticas y series de 30 días son arrays escritos a mano. |
| Panel gerente: empresa / flota / conductores | `app/(gerente)/gerente/{empresa,flota,conductores}/page.tsx` | EXISTE-SIN-PROBAR |
| Formateo de precios, fechas y duraciones | `lib/utils.ts`, `__tests__/unit/utils.test.ts` | FUNCIONA-PROBADO (13 casos) |

Entorno local **al 19-08**: `.env.local` tiene `NEXT_PUBLIC_MOCK=false` y
`NEXT_PUBLIC_API_URL` apuntando a
`https://nombre-proyecto-back-staging.up.railway.app`, así que la app **ya se
levanta contra staging**. `NEXT_PUBLIC_MOCK_ROLE=ADMIN` queda inerte: sólo se lee
cuando `MOCK` es `true` (todos los sitios comparan `=== "true"`, así que el
espacio de más al final del valor no molesta). Hay un deploy en Vercel
(`README.md:49`) cuyo comportamiento real no es verificable acá.

Staging responde: `GET /health` devuelve `200 {"status":"ok"}` y los endpoints
autenticados devuelven `401 {"error":"Token no proporcionado"}` sin token
(verificado el 19-08 con `curl`).

### Intento de verificación contra staging — CORTADO (19-08)

Se levantó la app contra staging y **no se pudo pasar del login**. Lo verificado
antes de trabarse:

| Chequeo | Resultado |
|---|---|
| `GET /health` | `200 {"status":"ok"}` |
| Endpoint autenticado sin token | `401 "Token no proporcionado"` |
| `/`, `/viajes`, `/gerente` sin sesión | `307 → /login` (el proxy corta bien) |
| `/login` | `200`, consola sin errores ni warnings de hidratación |
| Firebase init | Sin `auth/invalid-api-key`: la key de `.env.local` es válida |
| Login con Firebase | **Funciona** — la sesión se crea en el cliente |
| `GET /api/auth/me` y `POST /api/auth/login` con token fresco | **401** |
| `POST /api/auth/registro-cliente` | **409** (email ya en Firebase) y después **500** |

**Causa más probable: se acabó el uso de Neon**, detectado al final de la sesión.
Sin base, el registro crea el usuario en Firebase pero no escribe la fila
(→ `500` + cuenta huérfana), y `/api/auth/me` no puede resolver el usuario
(→ `401`). **No verificado**: no se confirmó el estado de Neon ni se leyeron los
logs de Railway.

Dos bugs del backend quedan en pie aunque Neon vuelva, porque la caída sólo los
expuso:

1. **El registro no es atómico.** Si falla la escritura en la DB, el usuario de
   Firebase queda creado. Esa cuenta no puede entrar (el backend no la reconoce)
   ni volver a registrarse (`409` por duplicado en Firebase): el email queda
   quemado.
2. **`401` donde el contrato dice `404`.** `POST /api/auth/login` y
   `GET /api/auth/me` devuelven `401` con un token válido y sin fila en la DB; el
   contrato documenta `404 "Usuario no registrado"` para ese caso. El `401` hace
   parecer un problema de token lo que es un usuario faltante.

Herramientas dejadas para retomar: `scripts/verificar-staging.mjs` (contrasta los
campos nuevos contra el contrato) y `scripts/diagnostico-auth.js` (separa "no
llega el header" de "otro proyecto Firebase" de "falta la fila"). El pedido
armado para el backend está en `PEDIDO-BACKEND-19-08.md` (temporal).

**Conclusión: nada de la entrega del 19-08 está verificado contra el backend
real.** Todo lo integrado sigue probado sólo contra mocks.

---

## 2. Decisiones de negocio hardcodeadas

No hay schema de Prisma ni servicio de pricing acá. Los supuestos están congelados
o bien en el frontend, o bien en los `.md` de contrato como comportamiento del
backend. Se indica cuál es cuál en cada caso.

### Unidad de cobro

> **Contra las decisiones de producto (19-08):** todo lo de abajo es lo que el
> sistema hace **hoy**. `OPEN.md` → **D2 (ABIERTA)** dice que se mantienen CABA por
> hora y PROVINCIA por km, pero que además entran unidades industriales (por viaje
> contratado, por palet, por tonelada) y precio fijo al confirmar con banda de ±15 %.
> Nada de eso existe en el código ni en el contrato. **No implementar hasta que D2
> cierre.**

- **Se cobra por tiempo y/o por distancia, según la zona**; no existe unidad "por
  viaje", "por palet", "por tonelada" ni "por kg".
  `context/api-contracts/context.md:1148-1149`: `precio_por_tiempo` es `null` en
  `PROVINCIA` y `precio_por_distancia` es `null` en `CABA`. O sea: **CABA se cobra
  por hora, PROVINCIA por km, MIXTO por ambos**.
- Los únicos campos de tarifa que el front acepta y muestra son `tarifa_hora` y
  `tarifa_km` (`hooks/useViajeActivo.ts:51-52`). No hay estructura para otra unidad.
  Los valores los define el backend con variables `TARIFA_*`
  (`context/api-contracts/context.md:354-355`) y no son verificables acá; los del
  repo son fixtures incompatibles entre sí (5000/200 en `:366-367`, 3500/10 en
  `:1133-1134`, 100 en `lib/api.ts:355`).
- **Hora pico congelada:** 7–10 h y 17–20 h (`:355`), determinada por
  `fecha_programada`. Sin escalas, sin días de la semana, sin feriados.

### Fee

- **Porcentaje y base:** `FEE_PORCENTAJE`, entero, **default 10**, aplicado como
  `precio_real * FEE_PORCENTAJE / 100` (`context/api-contracts/context.md:2254`,
  `:2208`). Es `null` mientras no haya `precio_real`.
- **Solo se aplica a viajes `FINALIZADO`** — los `CANCELADO` no generan fee ni
  ingreso para nadie (`context/api-contracts/context.md:2253`).
- **Reparto:** `total_neto_conductores = total_precio_real_finalizados - total_fee_app`
  (`:2295`). La plata se parte en dos, app y conductor: no hay corte para la
  empresa fletera como entidad distinta del conductor.
- En el front el fee es solo lectura y solo para el ADMIN
  (`app/(admin)/admin/page.tsx:61-62`, `app/(admin)/admin/viajes/[id]/page.tsx:103`).
  El cliente **nunca ve el fee**. Congelado al 10 % en los fixtures
  (`lib/api.ts:461`: 1750 → 175; `:520-522`: 4950 → 495 de fee, 4455 neto).

### Momento y método de cobro

- **No existe cobro en el frontend.** Ni endpoint de pago, ni estado de pago en el
  viaje, ni campo `pagado`, ni integración de MercadoPago en este repo.
  **Corrección (19-08-2026):** la "corrección" del 12-08 que decía que
  `MERCADOPAGO_ACCESS_TOKEN` ya no estaba en `.env` era **falsa**. Sí está. Las
  variables de `.env` son `DATABASE_URL`, `FIREBASE_PROJECT_ID`,
  `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, `REDIS_URL`,
  `CLOUDFLARE_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
  `R2_BUCKET_NAME`, `R2_PUBLIC_URL`, `MERCADOPAGO_ACCESS_TOKEN`,
  `GOOGLE_MAPS_API_KEY`, `PORT` y `NODE_ENV` (verificado leyendo los nombres, no
  los valores). Es el `.env` **del backend**, que no debería estar en este repo.
  Que exista el token no prueba que el backend cobre: prueba que alguien lo
  configuró. El medio de cobro sigue siendo `OPEN.md` → D3, ABIERTA.
- Lo único que se emite al final es un **remito PDF**
  (`context/api-contracts/context.md:1962-1980`): cliente, conductor, paradas con
  fecha de entrega y desglose de costo. No es comprobante fiscal ni de cobro.
- **El precio se congela** al confirmar la última parada: el backend emite
  `viaje:finalizado` con `precio_real` y `remito_url`. Desde el 19-08 el disparador
  ya no es el QR sino la confirmación por proximidad GPS, y el evento **se sigue
  emitiendo igual**. Falta todavía la foto del remito conformado (D5). Quién paga a
  quién, cuándo y por qué medio: **no está en ningún lado**, y es D3, ABIERTA.

### Estados del viaje y qué cierra cada parada

Nueve estados, congelados en `lib/estados.ts:9-19` y `:25-35` y en el contrato
(`context/api-contracts/context.md:2547`): `BUSCANDO_CONDUCTOR`,
`RESERVADO_POR_EMPRESA`, `CONDUCTOR_ASIGNADO`, `EN_CAMINO_A_ORIGEN`, `CARGANDO`,
`EN_RUTA`, `DESCARGANDO`, `FINALIZADO`, `CANCELADO`.

- Terminales: `FINALIZADO` y `CANCELADO` (`lib/estados.ts:38`). "En curso" para el
  front: `EN_CAMINO_A_ORIGEN`, `CARGANDO`, `EN_RUTA`, `DESCARGANDO` (`:41-46`).
- Transiciones válidas: tabla en `context/api-contracts/context.md:2395-2415`;
  cualquier otra se rechaza con 400.
- **Qué cierra cada parada (actualizado 19-08, el QR ya no existe):** el conductor
  confirma la parada con `POST /api/viajes/:id/confirmar-parada` mandando
  `{ id_parada, lat, lng }`, y el backend valida que esté dentro de
  `RADIO_CONFIRMACION_METROS` (**default 50 m**, antes 200 fijo). Fuera del radio
  devuelve `400` y bloquea la entrega. Confirmar la **última** parada pendiente
  cierra el viaje (`DESCARGANDO → FINALIZADO`) y emite `viaje:finalizado` con el
  mismo payload de antes, así que `hooks/useViajeActivo.ts` no se vio afectado.
  Se eliminaron `GET /api/viajes/:id/qr-paradas` y el campo `qr_firmado`; el front
  web nunca los usó (eran de la app del conductor), así que no hubo nada que borrar.
  **El orden entre paradas no se valida:** se puede confirmar la 2 antes que la 1.
  `qr_token` sigue apareciendo en las paradas pero es **campo muerto** — no se
  firma, no se valida, no se muestra.
- **Falta la foto del remito conformado**, que es el núcleo de D5. Ver
  `OPEN.md` → D5 y `context/tasks/pendiente.md`.
- Transiciones manuales del conductor: solo `CARGANDO` y `DESCARGANDO`
  (`context/api-contracts/context.md:885`). `EN_CAMINO_A_ORIGEN` se dispara solo
  con el **primer ping GPS** (`context/model/context.md:1305`).
- El estado de una parada solo tiene dos valores: `PENDIENTE` y `ENTREGADO`
  (`hooks/useViajeActivo.ts:14`). No hay "rechazada", "parcial" ni "reprogramada".
- Timeout de reserva del gerente: **10 min** (`RESERVA_TIMEOUT_MINUTOS`,
  `context/api-contracts/context.md:2530`); vencido vuelve al mercado. Timeout sin
  conductor: **10 min** y el viaje se cancela (`context/model/context.md:1136`).
- Alertas: desvío si supera **300 m** (`DESVIO_UMBRAL_METROS`,
  `context/api-contracts/context.md:1295`); parada sospechosa si supera **5 min**
  (`PARADA_SOSPECHOSA_MINUTOS`, `:1321`) y solo en zonas `CABA` y `MIXTO`.

### Campos que describen la carga y el vehículo

**Carga:** el sistema **no la modela**. No hay peso, volumen, pallets, tonelaje,
valor declarado ni cantidad de bultos. Lo único que existe:

- `condiciones_requeridas`: lista cerrada de cinco etiquetas — `FRAGIL`,
  `REFRIGERADO`, `CARGA_PESADA`, `PELIGROSO`, `VOLUMINOSO`. Congelada cuatro veces
  en el front (`lib/types-empresa.ts:6-10`,
  `app/(cliente)/pedir-viaje/page.tsx:24-28`,
  `app/(conductor)/conductor/mis-vehiculos/page.tsx:32-36`,
  `app/(conductor)/conductor/registro-vehiculo/page.tsx:16-20`) y en el contrato
  (`context/api-contracts/context.md:357-358`).
- `descripcion`: texto libre, máximo 500 caracteres, **no afecta matching ni costo**
  (`context/api-contracts/context.md:352`). Es un campo de notas.
- `context/tasks/pendiente.md:112-115` lo admite: el detalle no tiene datos de carga
  y la "solución futura" es agregarlos. **Hoy no se puede cotizar por peso porque
  el peso no se pide.**

**Vehículo:** `patente`, `marca`, `modelo`, `anio`, `color`, `tipo_vehiculo`,
`condiciones[]` (`context/api-contracts/context.md:1489-1500`).

- `tipo_vehiculo` es un **string libre**, no un enum: "furgon", "camion",
  "camioneta" (`lib/api.ts:250`, `:344`), sin normalizar — el contrato usa
  "camioneta" en un lado y "furgon" en otro para el mismo Ford Transit.
- **No hay capacidad de carga en ninguna parte**: ni kg máximos, ni m³, ni largo de
  caja, ni pallets. Un vehículo se describe por marca y color, no por lo que puede
  transportar. `anio`: entre 1990 y el año actual (`:1497`).
- No hay VTV, seguro ni habilitaciones. El prototipo de diseño sí las dibuja
  (`context/prototype/data.js:57`) pero no existen en el contrato ni en el código.

### Qué se exige para que un fletero sea elegible

- **Regla única:** es elegible si y solo si tiene al menos un vehículo (propio o de
  su empresa) que cumple **todas** las condiciones del viaje; si el viaje no
  requiere condiciones, **alcanza con tener un vehículo cualquiera**
  (`context/api-contracts/context.md:426-431`; ídem a nivel flota en `:2446`).
- Al registrarse se exige `nro_licencia` y `licencia_vencimiento` (`:99-130`), pero
  **nada verifica que esté vigente al aceptar un viaje**: el vencimiento no entra
  en la elegibilidad.
- No hay antecedentes, seguro, calificación mínima, verificación de identidad,
  aprobación de la plataforma ni zona de operación. La calificación promedio se
  muestra pero **no filtra**.
- Único filtro humano: un gerente aprueba la afiliación de un conductor a su
  empresa (`PENDIENTE → ACTIVO`, `context/api-contracts/context.md:2433`). Eso no
  habilita al conductor en la plataforma: ya estaba habilitado solo.

### Otras constantes de negocio en el front

- ~~**`zona: "CABA"` hardcodeada en cada viaje creado**~~ — **RESUELTO (19-08).** El
  backend pasó a derivar la zona de las coordenadas de las paradas
  (`booleanPointInPolygon` contra el polígono oficial de CABA,
  `context/api-contracts/context.md:275-291`) y el campo del body **se acepta pero se
  descarta**. El front dejó de mandarlo y muestra la zona que devuelve el backend
  (`app/(cliente)/pedir-viaje/page.tsx:110-118`, `:150-156`). Con esto se cayó el peor
  supuesto congelado del repo: ya no se cobra todo con tarifa CABA.
- **Prorrateo de la zona `MIXTO` por cantidad de paradas, no por recorrido.** Nuevo
  supuesto que entró con lo anterior: `fraccion_caba = paradas_en_caba / total_paradas`
  (`context/api-contracts/context.md:36-45`). Un viaje con 1 parada en CABA y 1 en
  provincia factura mitad y mitad aunque el tramo en CABA hayan sido tres cuadras. El
  backend lo declara como aproximación conocida. El front ya muestra lo facturado
  aparte del total medido (`app/(cliente)/viaje-activo/page.tsx:358-380`).
- Anticipación mínima: **1 hora**, sin tope máximo
  (`app/(cliente)/pedir-viaje/page.tsx:30-35`, `context/api-contracts/context.md:346-349`).
  Mínimo de paradas: 2 (`:297`).
- Cookie de sesión: **7 días** (`app/api/auth/cookie/route.ts:14`). Firebase con
  `browserSessionPersistence`: la sesión se borra al cerrar la pestaña
  (`lib/firebase.ts:16`).
- Roles: exactamente cuatro — `CLIENTE`, `CONDUCTOR`, `GERENTE`, `ADMIN`
  (`lib/roles.ts:1`).

---

## 3. Qué asume el código sobre el cliente

- **No paga.** Ni antes ni después: no hay tarjeta, token de pago, checkout ni
  estado de pago. El viaje se crea y se ejecuta sin ninguna garantía de cobro
  modelada. El único artefacto post-viaje es el remito PDF.
- **No hay cuenta corriente.** Ningún saldo, límite de crédito, deuda ni resumen
  de cuenta. "Facturación" es un item de menú deshabilitado con etiqueta "Próx."
  (`components/shells/ClienteShell.tsx:122`).
- **No hay factura.** Ni tipo (A/B/C), ni condición frente al IVA, ni punto de
  venta, ni CAE, ni numeración fiscal. El remito **no es una factura**.
- **No hay orden de compra.** Ni número de OC, ni centro de costo, ni referencia
  externa, ni aprobador. Lo más cercano es `descripcion`, texto libre inerte.
- **Se asume una empresa, pero se modela una persona.** El registro exige DNI,
  nombre y apellido, y fuerza "Nombre de la empresa" y "CUIT" como obligatorios
  (`app/(auth)/registro/page.tsx:66`, `:76`, `:81`) bajo el subtítulo "Para
  empresas que contratan fletes" (`:50`) — mientras el contrato los marca
  opcionales. La empresa del cliente no es una entidad: son dos strings colgados
  del usuario.
- **Un usuario por empresa.** No hay invitaciones, miembros, roles internos ni
  permisos. Dos empleados de la misma PyME son dos clientes distintos que no ven
  los viajes del otro: `mis-viajes` es por `id_cliente`, no por empresa. El
  analytics es el gasto de **una persona**, no de la compañía.
- Asimetría: **la empresa fletera sí es entidad de primera clase** (flota,
  afiliaciones, varias empresas por gerente — `hooks/useEmpresa.tsx`); la empresa
  cliente no existe. Tampoco hay "solicitante distinto del pagador" ni
  destinatario con cuenta.

---

## 4. Contradicciones

Revisadas el 19-08. Las marcadas **RESUELTA** se saldaron en el pase de
documentación del 12-08; las que quedan **ABIERTA** siguen vivas y son lo que hay
que atacar.

- **RESUELTA** — `CLAUDE.md:4` decía "confirmación por QR". Reescrito el 12-08: el
  cierre es por foto del remito conformado (`OPEN.md` → D5).
- **RESUELTA** — `CLAUDE.md:18` prometía "Pagos: MercadoPago SDK". Borrado; el medio
  de cobro es D3, ABIERTA.
- **ABIERTA (parcial)** — la regla "el frontend nunca calcula nada" contra
  `app/api/analytics/cliente/resumen/route.ts:124-156`, que calcula total gastado,
  costo promedio, extremos, conteo por zona, suma de alertas y top de destinos.
  `CLAUDE.md` ya no afirma la regla vieja: la marca **PENDIENTE DE DEFINIR** con la
  evidencia. Pero la decisión de fondo —si la capa BFF es legítima o no— **no está
  tomada**, y `docs/academico/CALIDAD.md:14` y `DEFENSA.md:86-101` siguen diciendo lo
  contrario entre sí (ese directorio está en `.claudeignore`, así que ya no
  contamina las sesiones).
- **RESUELTA** — `CLAUDE.md` ubicaba los contextos en `/tasks/`, `/stack/`,
  `/model/`. Corregido a las rutas reales bajo `context/`; se aclara que
  `/stack/context.md` no existe y su contenido está en `context/context.md`.
- `docs/academico/CALIDAD.md:83` y `:138` dicen "`proxy.ts` es un no-op" y que el control de
  acceso es client-side / `proxy.ts:20-29` redirige a `/login` sin cookie y
  `lib/auth-server.ts:71-76` hace el guard de rol server-side en cada layout. El
  comentario del propio test E2E (`__tests__/e2e/auth.spec.ts:26-27`) repite el
  dato viejo.
- **RESUELTA** — `docs/PROYECTO.md` marcaba "Dashboard métricas", "Perfil" y "Panel
  gerente" como stubs. Corregido: los tres están escritos y el panel gerente tiene
  **seis** páginas. La tabla ahora distingue "escrito" de "verificado".
- **RESUELTA** — `docs/PROYECTO.md:15` describía al gerente como operador interno de
  la plataforma. Corregido: responsable de una **empresa fletera externa**; quien
  administra la plataforma es `ADMIN`, que ahora sí figura.
- **RESUELTAS en `context/context.md`** (19-08) — decía dos roles en el JWT
  (`CLIENTE | GERENTE`), Tailwind, "gráficos: no en MVP",
  `NEXT_PUBLIC_WS_URL` y un singleton `lib/socket.ts`. Nada de eso era cierto: hay
  cuatro roles (`lib/roles.ts:1`), los estilos son CSS plano, existe
  `components/admin/Charts.tsx`, ninguna línea de código lee `NEXT_PUBLIC_WS_URL`
  (aunque el CI la sigue declarando, `.github/workflows/ci.yml:35`) y no hay
  `lib/socket.ts`: hay dos conexiones Socket.io independientes. El archivo quedó
  corregido con una cabecera que dice qué es verificado y qué es plan original.
- `context/api-contracts/context.md:60-90` marca `cuit` y `nombre_empresa` como
  opcionales y la contraseña con mínimo 6 caracteres / el formulario los exige
  obligatorios y pide mínimo 8 (`app/(auth)/registro/page.tsx:76`, `:81`, `:86`).
- `context/api-contracts/context.md:234-250` define que `PUT /api/auth/perfil`
  acepta solo `nombre`, `apellido` y `telefono` / `app/(cliente)/perfil/page.tsx:113-118`
  también manda `empresa` y `cuit`.
- `context/model/context.md:1497-1498` dice que el `vehiculo` de
  `viaje:conductor_asignado` puede ser `null` / `context/api-contracts/context.md:2546`
  dice que **siempre** es un objeto no nulo. Los dos documentos de contrato están
  desincronizados entre sí.
- **RESUELTA** — `context/tasks/F3-gerente/context.md` describía asignación directa
  sin el paso de reserva. Lleva cabecera **DESACTUALIZADO** desde el 12-08, con el
  detalle de qué cambió; el cuerpo se dejó intacto como registro de lo planificado.
- **RESUELTA** — `context/tasks/pendiente.md` afirmaba que tres gaps del gerente
  "quedaron resueltos e integrados". Marcado **NO VERIFICADO**, con el porqué: el
  panel corre contra `lib/mocks-gerente.ts` y que el mock responda no prueba que el
  endpoint exista.
- `docs/academico/DEFENSA.md:136` afirma que ningún secreto está en el repo.
  `.env.local` tiene la API key de Firebase y la de Google Maps en claro, y `.env`
  tiene además de `DATABASE_URL`, `REDIS_URL` y `FIREBASE_PRIVATE_KEY` **las cuatro
  claves de R2, el account id de Cloudflare y `MERCADOPAGO_ACCESS_TOKEN`**
  (corregido el 19-08: el 12-08 se escribió acá que R2 y MercadoPago no estaban, y
  era falso). Están ignorados por git y no aparecen en el historial
  (`git log --all -- .env` vacío): la afirmación vale para el repo, **no para la
  máquina**. `.env` es el del backend y no tendría que estar en este repo; conviene
  moverlo y, si esas claves son de producción, rotarlas.
- **ABIERTA, a propósito** — `docs/academico/DEFENSA.md` termina en las líneas
  210-211 con etiquetas XML residuales: quedó cortado a mitad de una generación. Se
  decidió dejarlo así y solo moverlo.
- **RESUELTA** — `README.md:36` apuntaba a `./CALIDAD.md` en la raíz. Corregido a
  `docs/academico/CALIDAD.md`, junto con las 9 referencias a `docs/CALIDAD.md` /
  `docs/DEFENSA.md` que quedaron viejas en este mismo archivo.
- **ABIERTA** — `__tests__/e2e/auth.spec.ts:26-27` sigue comentando que el redirect
  lo hace el layout "del lado del cliente". Lo hace `proxy.ts:20-29` server-side. Es
  un comentario en un test, no cambia el resultado, pero repite el dato viejo.
- **ABIERTA** — el contrato dice que las magnitudes facturadas (`tiempo_capital`,
  `distancia_provincia`) viajan en el evento `viaje:finalizado` y en
  `desglose_estimado`, pero ninguno de los dos ejemplos las muestra. Tipadas como
  opcionales en `hooks/useViajeActivo.ts:52-70` hasta que el backend confirme.

---

## 5. Qué se puede demostrar (estado de la demo)

Todo lo demostrable hoy asume `NEXT_PUBLIC_MOCK=true`, que es como está
configurada la máquina (`.env.local`). En ese modo **nada toca el backend ni
Firebase**: `lib/api.ts:603-662` intercepta cada llamada y devuelve fixtures con
300 ms de latencia simulada. Se puede mostrar:

1. **Login.** Cualquier email y cualquier contraseña entran
   (`hooks/useAuth.tsx:156-161`). Se rompe si preguntan qué pasa con una
   contraseña equivocada: no hay validación. El rol lo decide una variable de
   entorno del build, no el usuario.
2. **Dashboard analítico del cliente.** $47.100 gastados, 11 fletes, promedio
   $6.728, top 5 destinos: **todo inventado**
   (`app/api/analytics/cliente/resumen/route.ts:9-24`) y nunca cambia. Al mover el
   selector de período los KPIs no se mueven; solo se recalcula la posición de la
   barra del gráfico según el día del mes (`:26-33`).
3. **Historial de viajes.** 11 viajes fijos con fechas de mayo de 2026 escritas a
   mano (`lib/api.ts:49-226`) — tres meses atrasadas respecto de hoy.
4. **Detalle de viaje.** Solo el viaje 103 tiene detalle rico con ruta y conductor
   (`lib/api.ts:293-346`); los otros diez muestran una versión degradada del item
   de lista. El botón "Descargar remito PDF" abre una URL de ejemplo
   (`pub.r2.example.com`) que **no existe** (`lib/api.ts:632`).
5. **Pedir un viaje.** El autocompletado de Google Places sí es real y consume la
   API key de `.env.local` — lo único de la demo que sale a internet. Al enviar
   devuelve siempre el mismo viaje 99 a $8.500 (`lib/api.ts:37-48`), sin importar
   origen, destino ni fecha. Se rompe la ilusión al pedir dos viajes distintos.
   Desde el 19-08 la confirmación muestra además la **zona** que devolvió el backend;
   en MOCK el fixture siempre dice `CABA`.
6. **Seguimiento en vivo.** La demo más vistosa y la más falsa: marcador que se
   mueve por interpolación lineal entre dos puntos fijos cada 3 s, costo que sube
   $60 cada 5 s, ETA que baja 30 s cada 5 y una "ruta recalculada por desvío" que
   salta siempre a los 12 s exactos (`hooks/useViajeActivo.ts:134-207`). No hay
   conductor del otro lado. Pasados ~90 s el marcador llega al final y se queda
   quieto mientras el costo sigue subiendo para siempre.
7. **Panel del gerente.** La lista "en tiempo real" es un `setInterval` que inventa
   un viaje cada 4 s con precios que suben de a $850
   (`app/(gerente)/gerente/page.tsx:41-63`). Reservar y asignar responden desde
   `lib/mocks-gerente.ts`.
8. **Panel de administración.** Seis usuarios y cinco viajes escritos a mano;
   las series de 30 días son arrays literales (`lib/api.ts:502-517`). El total
   facturado del negocio entero es $4.950.
9. **Tests corriendo.** `npm test` (13 casos de formateo) y `npm run test:e2e`
   (2 de auth) pasan, siempre que se aclare que no cubren nada más.

Lo que **no** se puede demostrar, en ninguna configuración:

- Cobrar, facturar o ver un saldo. Calificar al conductor. Estimar un precio antes
  de confirmar el pedido.
- Cerrar un viaje: lo cierra la app del conductor confirmando la última parada por
  proximidad GPS, que en este repo no existe. Desde el dashboard web el flujo no
  tiene final. La foto del remito conformado tampoco está implementada del lado del
  backend, así que no hay nada que mostrar todavía.
- Cotizar por peso, volumen o pallets: esos datos no se piden.
- Que un viaje a provincia se cobre distinto de uno a CABA (`zona` va fija).
- Dos usuarios de la misma empresa cliente viendo los mismos viajes.
- Cualquier cosa contra el backend real: **no hay una sola evidencia en el repo de
  que la app haya funcionado end-to-end contra el backend de Railway.** Si el lunes
  se apaga el modo MOCK, lo que pase es no verificable desde acá.

---

## 6. Contenido no técnico

Prácticamente no hay: en ~10.000 líneas de `.md` **no existe ninguna sección de
mercado, competencia, entrevistas, validación con clientes, pricing comercial ni
modelo de negocio**. Lo único no técnico que aparece, textual:

- `CLAUDE.md:4`: "Marketplace de fletes para PyMEs argentinas. Modelo tipo Uber:
  cliente solicita viaje, matching automático con fletero, seguimiento GPS,
  confirmación por QR, precio ajustado con datos GPS reales. Zona: CABA + GBA."
- `CLAUDE.md:8-9`: los dos usuarios del panel web son "Cliente (PyME): analytics
  histórico de sus fletes" y "Gerente de empresa fletera: recibir peticiones de
  viajes y distribuirlas entre su flota".
- `README.md:3-5`: "marketplace de fletes que conecta clientes (empresas o
  personas que necesitan transporte de carga), conductores y gerentes".
- `docs/PROYECTO.md:9-13`: "Cliente — empresas o personas que necesitan transporte
  de carga"; "Conductor — choferes que aceptan y realizan los viajes"; "Gerente —
  operadores internos que administran la plataforma".
- `app/(auth)/registro/page.tsx:50`: "Para empresas que contratan fletes".
- Único porcentaje comercial documentado: `FEE_PORCENTAJE`, default **10**
  (`context/api-contracts/context.md:2254`).
- No hay ninguna tarifa comercial documentada. Los números existentes son fixtures
  incompatibles entre sí: hora 5000 / km 200 (`:366-367`); hora 3500 / km 10
  (`:1133-1134`); km 100 (`lib/api.ts:355`). Hora pico: 7–10 h y 17–20 h (`:355`).
- Los únicos nombres, empresas y montos "de cliente" del repo son de un prototipo
  de diseño (`context/prototype/data.js`) y son inventados. Copiados textualmente
  por si sirven como referencia de qué se imaginó el producto:
  - Usuaria: "Mariana Vázquez", mariana@distribucionlumina.com.ar, empresa
    "Distribuidora Lumina", CUIT 30-71445098-3, rol CLIENTE.
  - Período "Abril 2026": total gastado **1.842.350**, 47 viajes, costo promedio
    **39.198**; más caro VJ-2419 por **184.500** (Vicente López → Pilar); más
    barato VJ-2387 por **8.400** (Palermo → Belgrano). Gasto por zona: CABA
    **612.400**, PROVINCIA **894.200**, MIXTO **335.750**.
  - Destinos frecuentes: "Av. Crovara 4250, La Tablada" (11, PROVINCIA);
    "Mercado Central, Tapiales" (8, PROVINCIA); "Dock Sud, Avellaneda" (6,
    PROVINCIA); "Av. Warnes 1840, CABA" (5, CABA); "Parque Industrial Pilar"
    (4, MIXTO).
  - Semanas: Sem 1 → 9 viajes / 312.400; Sem 2 → 14 / 521.800; Sem 3 → 11 /
    408.200; Sem 4 → 13 / 599.950.
  - Viaje VJ-2419: estimado 162.000, final 184.500, duración estimada 95 min /
    real 138 min, 71 km reales, 2 alertas; conductor "Hernán Pereyra" (4.8),
    ayudante "Lautaro Méndez" (Carga y descarga); vehículo "AE 410 NX", tipo
    "Camión 8m³", condiciones VOLUMINOSO y CARGA_PESADA, credenciales "VTV
    vigente", "Seguro AllRisk", "RUTA habilitado"; carga "12 pallets de
    luminarias LED industriales", 1840 kg.
  - Otras cargas: "6 pallets — repuestos eléctricos" (540 kg); "2 cajas —
    muestras comerciales" (18 kg); "Mercadería seca — 1100 kg"; "Contenedor
    parcial — insumos importados" (2200 kg).
  - Alertas: "Desvío de 3.2 km respecto a ruta óptima" (09:14); "Detención de 18
    min sin parada planificada" (09:31); "Desvío de 1.8 km" (12:21); "Detención
    de 12 min en zona no planificada" (16:18).

  Ese prototipo describe ayudante, peso, pallets, credenciales del vehículo, km
  reales, duración estimada y gasto por zona en pesos. **Ninguno de esos campos
  existe en el contrato ni en el código.**
- `docs/academico/CALIDAD.md:7` menciona la consigna académica de origen ("TP3_-_DevOps.pdf");
  `docs/academico/CALIDAD.md:144-156` y `docs/academico/DEFENSA.md` entero son material de defensa oral
  de un trabajo práctico, no documentación de producto.
