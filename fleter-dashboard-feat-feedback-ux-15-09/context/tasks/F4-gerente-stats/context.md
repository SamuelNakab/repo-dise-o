# F4-gerente-stats — Estadísticas Históricas del Gerente

## Prerequisito
F3-gerente completo y funcionando.

## Objetivo
El gerente puede ver un resumen analítico de su empresa: facturación, viajes completados, rendimiento por conductor y por vehículo.

## Subtareas

### F4-1: Selector de período (reutilizar el de F1)
- [ ] El mismo componente `<SelectorPeriodo>` del dashboard de cliente
- [ ] Modos: Mensual | Semanal | Personalizado
- [ ] Default: mes actual

### F4-2: Cards de métricas de la empresa
Página `/app/(gerente)/estadisticas/page.tsx`

**Cards a mostrar:**
- [ ] **Total facturado** en el período
- [ ] **Cantidad de viajes** completados
- [ ] **Ingreso promedio** por viaje
- [ ] **Viajes cancelados** y monto de penalidades en el período
- [ ] **Vehículo más utilizado** (patente + cantidad de viajes)

**Endpoint:** `GET /api/analytics/gerente/resumen?empresa_id=&desde=&hasta=`

### F4-3: Ranking de conductores
- [ ] Tabla con columnas: conductor, viajes completados en el período, ingresos generados
- [ ] Ordenable por viajes o por ingresos
- [ ] Incluido en la misma página de estadísticas, debajo de las cards

**Incluido en el mismo endpoint de resumen:** campo `ranking_conductores`

### F4-4: Tabla de viajes del período
- [ ] Listado de todos los viajes completados por la empresa en el período
- [ ] Columnas: fecha, conductor, vehículo, origen → destino, duración, monto cobrado
- [ ] Paginación
- [ ] Ordenable por fecha y monto

**Endpoint:** `GET /api/analytics/gerente/viajes?empresa_id=&desde=&hasta=&page=&limit=`

## Criterio de completitud
- El gerente puede ver el resumen de su empresa por período
- Las cards muestran skeleton mientras cargan
- El ranking de conductores es visible y ordenable
- La tabla de viajes está paginada

## Archivos relevantes
- `/api-contracts/context.md` → sección Analytics Gerente
- `/model/context.md` → entidades Viaje, Conductor, Transacción
