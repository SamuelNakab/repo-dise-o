# F2-cliente — Viaje Activo en Tiempo Real

## Prerequisito
F1-cliente completo y funcionando.

## Objetivo
Cuando el cliente tiene un viaje en curso (estado EN_CURSO), puede acceder a un panel de seguimiento con el mapa y el estado actualizado en tiempo real.

## Subtareas

### F2-1: Banner de viaje activo en el dashboard
- [ ] Si el cliente tiene un viaje en estado EN_CURSO, mostrar un banner en la parte superior del dashboard principal
- [ ] El banner muestra: estado actual del viaje, origen → destino, botón "Ver seguimiento"
- [ ] Si no hay viaje activo, el banner no aparece

**Endpoint:** `GET /api/viajes?estado=EN_CURSO` (o campo que devuelva si hay viaje activo)

### F2-2: Página de seguimiento en tiempo real
Página `/app/(cliente)/viaje-activo/page.tsx`

- [ ] Mapa de Google Maps con el pin del conductor moviéndose
- [ ] Panel lateral: estado actual, ETA, costo acumulado, lista de paradas con estado
- [ ] Alertas de desvío o parada sospechosa: banner visible sobre el mapa
- [ ] Al finalizar el viaje (evento `viaje:finalizado`): mostrar resumen con precio final y ajuste

**Nota técnica:** usar `ref` para el marcador del conductor en el mapa, no estado React — evita re-renders con cada ping GPS.

### F2-3: Conexión Socket.io
- [ ] Singleton de Socket.io en `/lib/socket.ts`
- [ ] Hook `useSocket` que se suscribe/desuscribe al montar/desmontar
- [ ] Al entrar a la página: emitir `join:viaje` con el ID del viaje activo
- [ ] Escuchar: `mapa:actualizar`, `viaje:estado_actualizado`, `alerta:desvio`, `viaje:finalizado`
- [ ] Al salir: `leave:viaje` y desconectar listeners

## Criterio de completitud
- El banner aparece en el dashboard cuando hay un viaje activo
- El mapa muestra el pin del conductor moviéndose en tiempo real
- Las alertas de desvío aparecen claramente sobre el mapa
- Al finalizar el viaje, se muestra el resumen automáticamente

## Archivos relevantes
- `/api-contracts/context.md` → sección Eventos Socket F2
- `/stack/context.md` → sección Socket.io y Google Maps
- `/model/context.md` → estados del viaje
