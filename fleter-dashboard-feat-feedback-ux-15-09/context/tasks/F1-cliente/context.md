# F1-cliente — Dashboard Analítico PyME

## Objetivo
El cliente (PyME) ve un resumen claro de sus gastos en fletes para el período seleccionado, y puede explorar el listado completo de viajes con detalle de cada uno.

## Notas de estado del producto
- **Google Maps API no integrada aún:** `precio_real`, `duracion_real`, `km_reales`, horas de entrega de paradas son `null` en datos reales. El front muestra "—" en esos campos.
- **Zona:** la evalúa el backend con Google Maps. El front siempre envía `zona: "CABA"` como placeholder. El selector de zona no existe en la UI.

---

## Subtareas

### F1-0: Scaffold y auth (prerequisito)
- [x] Estructura de carpetas + Firebase Auth en `/lib/firebase.ts` + hook `useAuth`
- [x] Pantalla de login: email/password + Google OAuth
- [x] Pantalla de registro de cliente
- [x] Pantalla de recupero de contraseña
- [x] Layout con sidebar (items: Dashboard, Mis viajes, Perfil)
- [x] JWT en cookie httpOnly al hacer login

**Endpoints:** `POST /api/auth/login`, `POST /api/auth/registro-cliente`, `POST /api/auth/recuperar-password`

---

### F1-1: Selector de período (componente compartido)
- [x] Componente `<SelectorPeriodo>` reutilizable en todo el dashboard
- [x] Cuatro modos: Mensual | Semanal | Todo | Personalizado (date picker de rango)
- [x] Hook `usePeriodo` con estado global; expone `queryParams` para armar URLs
- [x] Al cambiar el período, todos los componentes que dependen de él se actualizan
- [x] Default: mes actual

---

### F1-2: Cards de métricas (vista principal del dashboard)
Página `/app/(cliente)/page.tsx`

#### BFF Route Handler
El dashboard no llama al backend directamente. Usa un Route Handler en `/app/api/analytics/cliente/resumen/route.ts` que:
- Recibe `?desde=&hasta=` (omitir = todo)
- Lee el cookie `token` con `cookies()` de `next/headers`
- Llama `GET ${API_URL}/api/viajes/mis-viajes` con el token del usuario
- Procesa en servidor: totales, promedios, por zona, top destinos
- Devuelve JSON procesado (el front no ve datos crudos)
- En `NEXT_PUBLIC_MOCK=true`: devuelve fixture hardcodeado

**Variables de entorno:** ninguna nueva — usa `NEXT_PUBLIC_API_URL` y el cookie `token`.

**Prewarming:** después de login exitoso, `hooks/useAuth.tsx` hace `fetch('/api/analytics/cliente/resumen').catch(() => {})` fire-and-forget para despertar la función serverless antes de que el usuario llegue al dashboard.

#### Cards a mostrar
- [x] **Total gastado** en el período (suma `precio_real` de ENTREGADO; "Sin viajes completados" si 0)
- [x] **Cantidad de fletes** solicitados en el período
- [x] **Costo promedio** por flete (null → "—")
- [x] **Flete más caro** del período (monto + link al detalle; null → "—")
- [x] **Flete más barato** del período (monto + link al detalle; null → "—")
- [x] **Desglose por zona:** conteo CABA / PROVINCIA / MIXTO (no montos, precio_real puede ser null)
- [x] **Alertas recibidas:** conteo total
- [x] **Top 5 destinos frecuentes:** listado con dirección y count
- [x] Skeleton loaders por card mientras carga
- [x] Re-fetch automático al cambiar período

**Endpoint BFF:** `GET /api/analytics/cliente/resumen?desde=&hasta=`

---

### F1-3: Tabla de viajes
Página `/app/(cliente)/viajes/page.tsx`

**Columnas de la tabla:**
- [x] Fecha
- [x] Origen → Destino
- [x] Zona (CABA / PROVINCIA / MIXTO)
- [x] Estado (badge de color)
- [x] Duración real (formateado "1h 20min"; "—" si null)
- [x] Costo estimado
- [x] Costo final ("—" si null)
- [x] Ajuste (diferencia estimado vs final; verde si bajó, rojo si subió; "—" si sin precio_real)
- [x] Alertas (badge con count si > 0)
- [x] Acción: flecha →

**Funcionalidades:**
- [x] Filtro de período (`<SelectorPeriodo>`)
- [x] Paginación cliente-side (7 por página, botones Anterior / Siguiente)
- [x] Ordenamiento por columna: fecha, costo final, duración (click en header)
- [x] Filas clickeables que llevan al detalle del viaje

**Endpoint:** `GET /api/viajes/mis-viajes`

---

### F1-4: Detalle de un viaje
Página `/app/(cliente)/viajes/[id]/page.tsx`

**Información a mostrar:**
- [x] Fecha y hora del viaje
- [x] Tipo de zona
- [x] Lista de paradas en orden con estado (PENDIENTE / ENTREGADO) y hora_entrega si disponible
- [x] Conductor asignado (nombre + calificación ★ si existe)
- [x] Costo estimado vs costo final con ajuste
- [x] Duración real y km reales ("—" mientras Google Maps no está integrada)
- [x] Historial de alertas del viaje (tarjeta aparece solo si `alertas[]` no vacío)
- [x] Botón "Descargar remito PDF" si estado === ENTREGADO (`GET /api/viajes/:id/remito`)

**Endpoint:** `GET /api/viajes/:id`

---

### F1-5: Perfil del cliente
Página `/app/(cliente)/perfil/page.tsx`

- [x] Mostrar datos: nombre, apellido, DNI, teléfono, email, empresa, CUIT, dirección
- [x] Botón "Editar" → campos habilitados (DNI y email son readonly)
- [x] Guardar cambios con feedback de loading/error
- [x] Cancelar → restaura valores sin llamada al backend

**Endpoints:** `GET /api/auth/me`, `PUT /api/auth/perfil`

---

## Criterio de completitud de F1
- [x] El cliente puede loguearse y ver el dashboard con sus métricas
- [x] Puede cambiar el período y todos los números se actualizan
- [x] Puede ver la tabla de viajes, ordenarla y paginarla
- [x] Puede entrar al detalle de cualquier viaje
- [x] Las cards muestran skeleton mientras cargan (no pantalla en blanco)
- [x] Puede editar sus datos de perfil

## Archivos relevantes para esta fase
- `/context/context.md`
- `/context/analitics/context.md` → patrón BFF (ya colapsado en F1-2 arriba)
- `/context/api-contracts/context.md` → secciones Auth, Perfil, Viajes
- `/context/model/context.md` → entidades Viaje, Parada, Transacción
