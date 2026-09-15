# Cambios UX — feedback del 15-09-2026

> Branch `feat/feedback-ux-15-09`. Registro de todo lo que se cambió a partir del
> recorrido de la app del 15-09. Cada ítem: qué se pidió, qué se hizo, archivos,
> y qué quedó pendiente o con placeholder. **Nada de esto está verificado contra el
> backend real** salvo donde se dice explícitamente.

## Decisiones de producto tomadas en la sesión (15-09)

| Tema | Decisión | Doc afectado |
|---|---|---|
| Landing | `/` es la landing (placeholder). El dashboard de la PyME pasa a `/panel`. | — |
| Facturación | Comprobantes por mes + **total del mes informativo**. Sin saldo, cuenta corriente ni factura. | `OPEN.md` → D3 (sigue ABIERTA) |
| Analytics | Se autoriza **cálculo de pantalla** nuevo en el BFF. La liquidación no pasa por el BFF. | `OPEN.md` → D6 |
| Viajes disponibles (conductor) | Rediseño visual, **mismo flujo**. No se tocan `viajes-disponibles` ni `viaje:aceptar`. | `OPEN.md` → D4 |
| Foto del vehículo | Selector con preview que **no se guarda** (no hay endpoint). Pedido al backend. | `PEDIDO-BACKEND-19-08.md` → H |
| Ganancia del conductor | Se muestra la tarifa **rotulada como bruta** ("antes de la comisión de Fleter"). Nunca dice "ganás". | `PEDIDO-BACKEND-19-08.md` → I |

---

## 0. Base compartida

| Qué | Archivo |
|---|---|
| Mapa con ruta para cualquier estado. Orden: `ruta_planeada` del backend → Google Directions con las paradas → línea recta **punteada y rotulada "aproximado"**. Mide km (`geometry.spherical.computeLength` o suma de tramos de Directions); con línea recta devuelve `null`, no un km falso. Sin `APIProvider` propio (antes anidaba uno dentro del global). | `components/MapaRuta.tsx`, `components/MapaRutaCanvas.tsx` |
| Contacto telefónico que funciona en desktop: número visible, copiar, `tel:` y WhatsApp. | `components/ContactoConductor.tsx` |
| `esEnCurso()` / `esProximo()` y `ESTADOS_PROXIMOS`. Única regla de "viaje en curso". | `lib/estados.ts` |
| Orden de paradas, origen/destino, dirección en dos líneas, formato de km y horas. | `lib/viajes.ts` |
| Tipos de vehículo y condiciones de carga en un solo lugar (estaban copiados en tres páginas). | `lib/vehiculos.ts` |
| Estilos nuevos (auth partido, stepper, cards seleccionables, período, KPIs, tabs, trip cards, detalle, facturación, dropzone). | `app/globals.css` (sección "Feedback UX 15-09") |

**Requisito externo:** el fallback de Directions necesita que la API key de Google
tenga habilitada **Directions API**. Si no, la consola muestra
`[MapaRuta] Directions falló` y el mapa cae a la recta rotulada.

## 1. Landing y auth

**Pedido:** login muy minimalista y con cara de mobile; no hay landing que lleve
al login; registro minimalista de más, chico y feo para conductor.

| Qué | Archivos |
|---|---|
| Landing placeholder en `/`: "Fleter" con la F naranja, "Landing page en desarrollo" en gris y link a "Iniciar sesión". Pública en `proxy.ts`. | `app/page.tsx`, `proxy.ts` |
| **Ruta movida:** el dashboard de la PyME pasó de `/` a `/panel`. | `app/(cliente)/panel/page.tsx`, `lib/roles.ts` (`homeForRole`), `components/shells/ClienteShell.tsx`, `__tests__/e2e/auth.spec.ts` |
| Layout partido de desktop para todas las pantallas de auth: panel oscuro de marca a la izquierda, formulario a la derecha; colapsa a una columna debajo de 900px. | `components/AuthShell.tsx`, `app/(auth)/layout.tsx` |
| Login: Google primero, "¿La olvidaste?" junto al campo de contraseña. Mismos ids y textos que usa el e2e. | `app/(auth)/login/page.tsx` |
| Registro: primero se elige perfil (PyME / Conductor / Empresa fletera); el de PyME va en secciones a lo ancho. | `app/(auth)/registro/page.tsx` |
| Registro de conductor en 4 pasos (Datos personales → Licencia → Cuenta → Vehículo), con confirmación de contraseña y vencimiento de licencia no anterior a hoy. Al terminar va a `/conductor/registro-vehiculo?onboarding=1`. | `app/(auth)/registro/conductor/page.tsx`, `components/Stepper.tsx` |
| Recuperar y registro de gerente adaptados al mismo layout. | `app/(auth)/recuperar/page.tsx`, `app/(auth)/registro/gerente/page.tsx` |

**Pendiente:** la landing real.

## 2. PyME — Analytics (`/panel`)

**Pedido:** estadísticas raras (pensar métricas y ordenarlas bien); no gusta cómo
se elige semanal, mensual y personalizado.

| Qué | Archivos |
|---|---|
| **Selector de período único:** Semana / Mes / Rango / Todo, con flechas ‹ › para ir al período anterior o siguiente (la flecha siguiente se deshabilita si el período ya incluye hoy) y popover de rango con atajos (7, 30, 90 días). Reemplaza a las tabs del dashboard y a `SelectorPeriodo` del Record, que eran dos controles distintos. | `components/PeriodoSelector.tsx`, `hooks/usePeriodo.tsx` (`shift`, `puedeAvanzar`); **borrado** `components/SelectorPeriodo.tsx` |
| **Layout nuevo**, de lo más mirado a lo menos: (1) KPIs — total gastado con variación, fletes finalizados sobre solicitados con barra y cancelados, costo promedio con variación, puntualidad; (2) evolución (barras de viajes y de gasto) + gasto por zona en pesos y cantidad; (3) flete más caro y más barato con su ruta, y "Servicio" (tasa de cancelación, duración promedio, alertas); (4) destinos frecuentes. | `app/(cliente)/panel/page.tsx` |
| **Bug arreglado:** el gráfico semanal metía todos los viajes del período en una sola barra (`computeChartSemanal`). Ahora la serie reparte por día (semana), por semana real del mes (mes) o por día/semana/mes según el largo del rango. | `lib/analytics-cliente.ts` |
| **Bug arreglado:** los buckets se armaban con la hora del servidor (UTC en Vercel). Un viaje del lunes a las 22 h de Argentina caía en el martes. El browser manda `tz` y el cálculo usa la fecha local. | `lib/analytics-cliente.ts`, `app/(cliente)/panel/page.tsx` |
| **Robustez:** el BFF trae `mis-viajes` una sola vez y filtra por período él mismo (el contrato no documenta filtros por fecha en ese endpoint; antes los mandaba igual y confiaba). | `app/api/analytics/cliente/resumen/route.ts` |
| MOCK con historial generado (~70 viajes en 6 meses, semilla fija) en vez de KPIs fijos que no cambiaban con el período. | `lib/mock-historial-cliente.ts` |

### Contrato del BFF `GET /api/analytics/cliente/resumen`

Query: `desde`, `hasta` (ISO), `vista` (`semanal` \| `mensual` \| `personalizado` \| `todo`), `tz` (minutos de `getTimezoneOffset()`).

| Campo | Cómo se calcula |
|---|---|
| `total_gastado` | Suma de `precio_real` de los `FINALIZADO` del período. |
| `cantidad_fletes` | Viajes del período (cualquier estado), por `fecha_programada ?? creado_en`. |
| `finalizados` / `cancelados` | Conteo por estado. |
| `tasa_cancelacion` | `round(cancelados / cantidad_fletes × 100)`; `null` sin viajes. |
| `costo_promedio` | `round(total_gastado / finalizados)`; `null` sin finalizados. |
| `duracion_promedio` | Promedio redondeado de `duracion_real` (min) de los finalizados que la tienen. |
| `puntualidad` | Conteo de `puntualidad_inicio` y `% A_TIEMPO` sobre los que la tienen. |
| `por_zona` / `gasto_por_zona` | Cantidad de viajes por zona / suma de `precio_real` de finalizados por zona. |
| `flete_mas_caro` / `flete_mas_barato` | Extremos por `precio_real` con `origen` y `destino` (primera y última parada). |
| `alertas_count` / `alertas_disponible` | Suma de `alertas_count`; `alertas_disponible=false` si ningún viaje trae el campo (hoy el backend no lo manda). |
| `top_destinos` | Top 5 de la última parada. |
| `periodo_anterior` / `variacion` | Mismas métricas del período inmediatamente anterior (semana −7 d, mes calendario anterior, rango del mismo largo) y variación % entera. `null` en `todo` o si la base es 0. |
| `serie[]` | `{ label, desde, hasta, solicitados, finalizados, gasto }` por tramo. |

**Removido del response:** `fletes_por_semana` (reemplazado por `serie`).
Todo es cálculo de pantalla autorizado el 15-09 (`OPEN.md` → D6). Tests:
`__tests__/unit/analytics-cliente.test.ts`.

## 3. PyME — detalle de viaje (`/viajes/[id]`)

**Pedido:** dirección rara, pocas estadísticas, sin mapa, precio muy chico, falta info.

| Qué | Archivos |
|---|---|
| Mapa con la ruta arriba, **en cualquier estado** (antes el recorrido sólo se veía en "viaje activo"). | `app/(cliente)/viajes/[id]/page.tsx`, `components/MapaRuta.tsx` |
| Origen y destino en dos líneas (calle / localidad) en lugar de un título "A → B" de 80 caracteres. | ídem, `lib/viajes.ts` (`separarDireccion`) |
| Precio en 44 px: el final si existe; si no, el estimado rotulado como tal y con la diferencia al cierre. | ídem |
| Estadísticas: duración estimada y real, km del recorrido (medidos sobre la ruta), km recorridos, horario programado, inicio real, puntualidad, paradas entregadas. | ídem |
| Info que faltaba: condiciones requeridas, indicaciones (`descripcion`), empresa, vehículo con año y color, calificación, contacto del conductor, CTA "Seguir en vivo" si está en curso. | ídem |
| **Bug arreglado:** la hora de las paradas leía `hora_entrega`; el contrato manda `fecha_entrega`. Siempre mostraba "—". | ídem |
| **Honestidad de datos:** `km_reales` y `alertas[]` no están en el contrato. Antes se veía "Sin alertas — viaje sin desvíos", que contra el backend real era falso siempre; ahora dice que el backend no las informa. | ídem |

**Pendiente (backend):** `km_reales`, `alertas[]`, distancia planificada → `PEDIDO-BACKEND-19-08.md` I, J.

## 4. PyME — "viaje en curso", mapa y contacto

**Pedido:** concepto raro de viaje en curso (aparecen algunos sólo por estar
aceptados); sólo se ve el recorrido de un viaje en curso; el mapa no muestra las
direcciones y sólo une los puntos; el botón de llamar no funciona.

| Qué | Archivos |
|---|---|
| "En curso" = `EN_CAMINO_A_ORIGEN`, `CARGANDO`, `EN_RUTA`, `DESCARGANDO`. Antes incluía `CONDUCTOR_ASIGNADO`, que prendía el banner con viajes aceptados para otro día. Nav renombrado "En curso". | `components/shells/ClienteShell.tsx`, `app/(cliente)/viaje-activo/page.tsx`, `lib/estados.ts` |
| Los asignados sin arrancar se ven como **PRÓXIMO** en el Record y en el detalle. Si se abre el seguimiento de uno así (link viejo), se ofrece ir al detalle. | `app/(cliente)/viajes/page.tsx`, `app/(cliente)/viaje-activo/page.tsx` |
| **Mapa:** causa real — `ruta_planeada` viene `null` en viajes terminados y cuando Google falló al crear, y el componente caía directo a una recta entre puntos. Ahora pide la ruta a Google Directions; sólo si eso falla dibuja la recta, punteada y rotulada "Recorrido aproximado". | `components/MapaRutaCanvas.tsx`; **borrado** `components/MapaViajeActivo.tsx` |
| **Llamar:** el botón era un `tel:` pelado, que en desktop no hace nada. Ahora: número visible, copiar, `tel:` y WhatsApp. | `components/ContactoConductor.tsx` |

## 5. PyME — Facturación (`/facturacion`)

**Pedido:** falta desarrollar el menú de facturación.

| Qué | Archivos |
|---|---|
| Item del sidebar habilitado. Página de comprobantes por mes: fecha, ruta, VJ, precio final y botón de remito PDF por viaje. | `app/(cliente)/facturacion/page.tsx`, `components/shells/ClienteShell.tsx` |
| **Total del mes** en el encabezado, rotulado *"Informativo · no es una liquidación ni una factura"*, calculado en un BFF nuevo. Agrupa por mes local del cliente. | `app/api/facturacion/cliente/route.ts`, `lib/facturacion-cliente.ts`, `__tests__/unit/facturacion-cliente.test.ts` |

**BFF nuevo `GET /api/facturacion/cliente?tz=`** → `{ meses: [{ clave, anio, mes, total_informativo, comprobantes: [{ id_viaje, fecha, zona, origen, destino, precio_real }] }] }`.

**Fuera de alcance a propósito (D3 ABIERTA):** saldo, cuenta corriente,
vencimientos, factura. Cuando D3 cierre, la liquidación la calcula el backend.

## 6. Conductor

### 6a. Bug "no figuran los viajes" — investigación

**Pedido:** "No figuran los viajes (no creo que no haya, creo que hay algo fallando)".

**No se pudo reproducir contra staging:** no hay credenciales de un conductor de
prueba en el repo, y `scripts/verificar-staging.mjs` necesita el token de una sesión
real. `GET /health` de staging responde `200` (15-09). **La causa real queda sin
confirmar.** Lo que sí se encontró leyendo el código contra el contrato:

| # | Hallazgo | Tipo | Estado |
|---|---|---|---|
| 1 | La página nunca escuchaba el evento `error` del socket. El contrato dice que los rechazos de `viaje:aceptar` (p. ej. *"No tenes un vehiculo que cumpla las condiciones del viaje"*) llegan **sólo** por `error`. El botón quedaba en "Aceptando..." 10 s y volvía sin explicación. | Bug del front | **Arreglado** |
| 2 | Escuchaba `viaje:no_disponible`, que **no existe** en el contrato. Cuando un gerente reserva, el servidor emite `viaje:reservado` ("sale del pool"). Los viajes reservados quedaban en la lista del conductor y fallaban al aceptar (y por 1, sin mensaje). | Bug del front | **Arreglado** (escucha `viaje:reservado`, igual que el panel del gerente) |
| 3 | `GET /api/viajes/disponibles` devuelve `[]` si el conductor **no tiene ningún vehículo elegible** — sin error. El registro permitía "Omitir por ahora" el vehículo sin avisar la consecuencia. | Datos / flujo | **Mitigado:** la lista vacía ahora dice si falta vehículo y lleva a cargarlo; el registro avisa que omitirlo deja la lista vacía. |
| 4 | Sólo aparecen viajes **en `BUSCANDO_CONDUCTOR` con fecha futura**. Con gerentes con flota elegible en staging, un viaje puede pasar a `RESERVADO_POR_EMPRESA` antes de que el conductor lo vea (mercado abierto, D4). | Datos | Hipótesis en pie, no verificable sin staging. |
| 5 | Los fixtures MOCK de `mis-viajes-conductor` no tenían la forma del contrato (sin fecha, precio ni zona). | Mocks | **Arreglado** |

**Hipótesis más probable para lo que se vio:** 3 (conductor sin vehículo o con
vehículo sin las condiciones del viaje) o 4. Para confirmarla: loguearse como ese
conductor contra staging y mirar en Network la respuesta de
`GET /api/viajes/disponibles` y de `GET /api/conductores/mis-vehiculos`.

### 6b. Pantallas

**Pedido:** disponibles feo; mis viajes "el peor menú": falta cuánto gano, cuántos
km, cuándo (fecha y hora), no se puede entrar al detalle ni ver el recorrido antes
de empezar; registrar vehículo feo, tipografía distinta, sin foto.

| Qué | Archivos |
|---|---|
| **Card de viaje** común: bloque de día y hora, ruta en dos líneas, km y duración, paradas, cliente, indicaciones, tarifa grande **rotulada "Tarifa del viaje · antes de la comisión de Fleter"**. | `components/conductor/TripCard.tsx` |
| **Km sin mapa:** mide `ruta_planeada` o pide la ruta a Directions con las paradas (acepta direcciones de texto). **Placeholder** hasta que el backend mande la distancia planificada. | `hooks/useDistanciaRuta.ts` |
| **Viajes disponibles:** cards nuevas, "Recorrido" despliega el mapa, indicador de conexión en vivo, lista vacía con diagnóstico (sin vehículos / sin viajes compatibles), confirmación con link al viaje. Flujo de aceptar **sin cambios** (D4). | `app/(conductor)/conductor/page.tsx` |
| **Mis viajes:** pestañas En curso / Próximos / Historial con contador; toda la card abre el detalle; para próximos y en curso se trae `GET /api/viajes/:id` para tener ruta y duración estimada. | `app/(conductor)/conductor/mis-viajes/page.tsx` |
| **Detalle nuevo** `/conductor/viajes/[id]`: mapa del recorrido **antes de empezar**, fecha y hora, desde qué hora se puede iniciar (`fecha_programada − 30 min`, default de `VENTANA_INICIO_MINUTOS`), distancia, duración, paradas, carga, cliente con contacto, vehículo y empresa. Sin botón "Iniciar": lo hace la app. | `app/(conductor)/conductor/viajes/[id]/page.tsx` |
| **Vehículos:** formulario único para onboarding y "Mis vehículos": tipo como cards con ícono, datos en grilla, condiciones como chips con explicación de elegibilidad. Encabezados con `.section-header` (la tipografía distinta venía de `.page-title`, que no existía en el CSS, y de una `auth-card` dentro del panel). | `components/conductor/VehiculoForm.tsx`, `app/(conductor)/conductor/registro-vehiculo/page.tsx`, `app/(conductor)/conductor/mis-vehiculos/page.tsx` |
| **Foto del vehículo:** selector con preview, badge **Próximamente** y texto fijo *"Todavía no guardamos la foto…"*. **No se envía.** El aviso de éxito dice "Vehículo registrado (sin foto)" si se había elegido una, y la lista muestra un ícono genérico, no la foto. | `components/conductor/VehiculoForm.tsx` |
| Nav del conductor marca la sección también en rutas anidadas. | `components/shells/ConductorShell.tsx` |
| Constantes de tipo de vehículo y condiciones unificadas. | `lib/vehiculos.ts` |

**Placeholders a reemplazar cuando llegue el dato del backend:**
- Tarifa bruta → ganancia neta del conductor (`PEDIDO-BACKEND-19-08.md` → I).
- Km medidos por Google → `distancia_estimada_km` (→ I).
- Foto que no se guarda → subida + `foto_url` (→ H).
- Ventana de inicio de 30 min hardcodeada en el texto → si cambia
  `VENTANA_INICIO_MINUTOS`, el texto miente (`VENTANA_INICIO_MIN` en el detalle).

## 7. Limpieza de estilos (base para el design system)

**Pedido:** pasar a clases los estilos inline que se repiten y borrar el CSS sin uso.

| Qué | Detalle |
|---|---|
| Inline → clases | `style={{…}}` de 393 a 298 en total; fuera de las pantallas del gerente, de ~200 a 98. Lo que queda son valores calculados (anchos de barras, alturas de gráficos) y ajustes de espaciado que aparecen una sola vez. |
| Clases nuevas | Utilidades (`.page-*`, `.stack`, `.cluster`, `.muted`, `.error-text`, `.patente`, `.skeleton*`) y modificadores de componente. Lista completa en `context/design-system.md` → "Limpieza de estilos". |
| CSS sin uso | ~60 reglas borradas (`.detail*`, `.time-cell*`, `.alerts-strip*`, `.trip-row__ajuste*`, `.selector-periodo*`, `.card--hero`, `.btn--icon`, `.delta--up/--down`…). `globals.css` pasó de 2725 a ~2520 líneas. Se borró sólo lo que no aparece en `app/`, `components/`, `lib/`, `hooks/` ni `__tests__/`, contando las clases que se arman con template strings. |
| Clase rota | `viaje-track__map-placeholder` se usaba y no existía: el "Cargando viaje…" quedaba arriba a la izquierda. Ahora usa `viaje-track__map-empty`, centrado sobre el fondo del mapa. |
| Fuera de alcance | Pantallas del gerente, `pedir-viaje`, `perfil`, admin y `AddressInput`: siguen con inline hasta que se rediseñen. |

**Cambios visibles, a propósito:**
- Anchos máximos de página unificados: 980 → 1000 px (Viajes disponibles, Mis viajes) y 820/860 → 840 px (vehículos).
- El botón de guardar de `VehiculoForm` usa `.btn--lg` (11×22 px, 14 px) como el resto de los formularios: 2 px más alto.
- `.btn` y `.auth-brand` ya no subrayan cuando son `<a>`. Arregla "Buscar viajes disponibles" en Mis viajes (estaba subrayado) y un botón-link del panel del gerente.
- La estrella de calificación en viaje activo pasó de `#F59E0B` (no es de la paleta) a `--warn`.

## 8. Documentación tocada

`OPEN.md` (D3, D4, D6), `CLAUDE.md`, `ESTADO-REAL.md`, `context/tasks/pendiente.md`,
`context/design-system.md`, `PEDIDO-BACKEND-19-08.md` (sin trackear: corregido E y F,
agregados H, I, J).

## Verificación (15-09)

| Chequeo | Resultado |
|---|---|
| `tsc --noEmit` | OK |
| `eslint` (app, components, lib, hooks, proxy, tests) | OK, 0 problemas |
| `vitest` | **18 tests OK** (13 de formateo + 4 de analytics + 1 de facturación) |
| `playwright test` (e2e) | **No corrió:** los 3 tests fallan antes de empezar porque faltan los navegadores de Playwright en la máquina (`npx playwright install`). No es un fallo de la app, pero **el e2e actualizado (`/panel`, landing) no está verificado**. |
| Recorrido manual en Chrome, build MOCK como CLIENTE | Landing, login (email + contraseña → `/panel`), registro por perfil, wizard del conductor, Analytics (mes, flecha anterior, semana: la serie reparte por día), detalle 103 (con `ruta_planeada`) y 101 (sin coordenadas → **Directions dibujó por calles, 5,7 km**), Facturación, seguimiento con contacto. Sin errores en consola. |
| Recorrido manual en Chrome, build MOCK como CONDUCTOR | Disponibles (fecha/hora, km y duración por Directions, tarifa rotulada), Mis viajes (pestañas con contadores), detalle 205 (3 paradas, 94,5 km, hora de apertura de inicio), registro de vehículo con stepper. Sin errores en consola. |
| Mapa: tiles parciales | En la pestaña automatizada el mapa mostraba tiles sólo en un recuadro y no dibujaba los pines, aunque la línea sí. La pestaña reportaba `visibilityState: "hidden"` (Google Maps pausa el render en pestañas no visibles). **Sin confirmar en un navegador visible** — revisar a mano `/viajes/103` y `/conductor/viajes/205`. |
| Consola de Google Maps | Aviso: `DirectionsService` está **deprecado** desde el 25-02-2026 a favor de `routes.Route.computeRoutes`. Sigue funcionando y no tiene fecha de baja (12 meses de aviso). Migración pendiente en `MapaRutaCanvas.tsx` y `useDistanciaRuta.ts`. |
| Contra staging (backend real) | **No verificado.** Sin credenciales de prueba; ver 6a. |

Se encontró y corrigió durante la verificación: "Septiembre De 2026" por
`text-transform: capitalize` en el selector de período y en Facturación.

### Verificación de la limpieza de estilos (sección 7)

| Chequeo | Resultado |
|---|---|
| `tsc --noEmit`, `eslint`, `vitest` | OK (18 tests) |
| Referencias a las clases borradas en `app/`, `components/`, `lib/`, `hooks/` y `__tests__/` | Cero |
| Estilos computados antes/después, builds MOCK de producción (CLIENTE y CONDUCTOR) | Se compararon 39 propiedades y el tamaño de cada elemento en `/login`, `/registro` (perfil PyME), `/registro/conductor`, `/registro/gerente`, `/recuperar`, `/panel`, `/viajes`, `/viajes/103`, `/facturacion`, `/viaje-activo`, `/conductor`, `/conductor/mis-viajes`, `/conductor/viajes/205`, `/conductor/mis-vehiculos` (con el formulario abierto) y `/conductor/registro-vehiculo?onboarding=1`. **Sin diferencias** salvo las buscadas: anchos de página, `.btn--lg` en `VehiculoForm`, link subrayado en Mis viajes y color de la estrella en viaje activo. El `list-style` del stepper cambia en el `<ol>` pero no se ve, porque los `<li>` ya lo tenían anulado. |
| No cubierto | Estados de hover, estados de carga (skeletons), la pantalla "Cargando viaje…" del seguimiento y los mapas (excluidos del diff). Las pantallas del gerente no se compararon: el único cambio que les llega es `text-decoration: none` en `.btn`. |
