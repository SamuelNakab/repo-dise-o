# CLAUDE.md — Fleter Dashboard (Web)

> Leer **`OPEN.md`** antes que este archivo. Si la tarea toca una decisión ABIERTA,
> no se implementa: se pregunta.

## Qué es Fleter
Fleter administra los fletes de tu PyME: los tuyos y los que te falten. El cliente
registra sus propios fleteros y Fleter se encarga de coordinación, seguimiento,
documentación y liquidación. Cuando su flota no da abasto, la app le consigue
transportistas verificados. Confirmación de entrega por **foto del remito
conformado**.

## Mi rol
**Dashboard web (Next.js).** El backend lo hace Persona 1 (Node.js + Express +
PostgreSQL); el contrato de la API es la fuente de verdad.

Hay **cuatro roles** (`lib/roles.ts`): `CLIENTE`, `CONDUCTOR`, `GERENTE`, `ADMIN`.
El `GERENTE` es responsable de una **empresa fletera externa**; quien administra la
plataforma es el `ADMIN`.

## Stack
Verificado contra `package.json`:
- **Framework:** Next.js 16 (App Router), React 19, TypeScript 5
- **Estilos:** CSS puro con custom properties (`app/globals.css`). **No hay Tailwind
  ni librería de componentes.**
- **Auth:** Firebase Auth — JWT en cookie httpOnly
- **Tiempo real:** `socket.io-client`
- **Mapas:** `@vis.gl/react-google-maps` · **Íconos:** `lucide-react`
- **Tests:** Vitest (unit) + Playwright (e2e)
- **Pagos:** ninguno. No hay dependencia ni código. Ver `OPEN.md` → **D3**.

## Regla de cálculo — ver `OPEN.md` → D6 (ABIERTA)
La regla vieja decía que el frontend **nunca calcula nada**. Matiz importante:
`app/api/analytics/cliente/resumen/route.ts:124-156` sí calcula seis métricas (total
gastado, costo promedio, extremos, conteo por zona, suma de alertas, top de destinos)
y arma los gráficos en `:68-94` — pero **es un BFF, no el browser**. Corre en el
servidor de Next y el cliente no tiene acceso ni a los viajes crudos ni a la lógica.
Fue una decisión tomada a propósito, por lo específicos que son esos cálculos.

Queda **ABIERTA** igual: falta definir el límite, sobre todo de cara a la liquidación
de D3. **No agregar cálculo nuevo en el BFF sin preguntar.**

**15-09:** se autorizó cálculo *de pantalla* para el Analytics y el total
informativo de Facturación. El cálculo se movió a módulos puros con tests
(`lib/analytics-cliente.ts`, `lib/facturacion-cliente.ts`); los Route Handlers sólo
hacen fetch. Nada con valor comercial pasa por ahí.

## Orden de desarrollo
| Fase | Qué es | Estado |
|---|---|---|
| F1-cliente | Auth + dashboard analítico de la PyME | Implementado, sin verificar contra backend real |
| F2-cliente | Viaje activo en tiempo real (banner + mapa) | Implementado, sin verificar contra backend real |
| F3-gerente | Panel del gerente: reservar y distribuir viajes | Implementado contra `lib/mocks-gerente.ts` |
| F4-gerente-stats | Estadísticas históricas del gerente | No empezado |

Estado detallado y verificado archivo por archivo: **`ESTADO-REAL.md`**.

**Rutas (desde el 15-09):** `/` es la landing pública (placeholder); el dashboard de
la PyME está en **`/panel`** (`homeForRole`). Rediseño de auth, PyME y conductor a
partir del feedback del 15-09: **`docs/CAMBIOS-UX-15-09.md`**.

## Archivos de contexto (rutas reales)
- `context/context.md` → decisiones técnicas (el doc lo llama "stack/context.md"; no existe esa carpeta)
- `context/model/context.md` → modelo de datos
- `context/api-contracts/context.md` → **fuente de verdad** de endpoints REST y eventos Socket.io
- `context/design-system.md` → tokens, componentes y convenciones CSS
- `context/tasks/F{N}-{rol}/context.md` → tareas por fase (`F1-cliente`, `F2-cliente`, `F3-gerente`, `F4-gerente-stats`, `devops`)
- `context/tasks/_PLANTILLA.md` → **formato obligatorio de toda tarea nueva**
- `context/tasks/pendiente.md` → datos que el backend todavía no provee
- `docs/PROPUESTA-CONTRATO.md` → discrepancias entre los tres docs de contrato (propuesta, no aplicada)

`docs/academico/` es material de defensa de un TP, no documentación de producto:
está en `.claudeignore`.

## Flujo de trabajo por sesión
1. Leer `OPEN.md`, después este archivo
2. Leer `context/tasks/F{N}-{rol}/context.md` de la fase en curso
3. `/add` solo los archivos de código relevantes a la subtarea
4. En sesiones largas, `/compact` al terminar
