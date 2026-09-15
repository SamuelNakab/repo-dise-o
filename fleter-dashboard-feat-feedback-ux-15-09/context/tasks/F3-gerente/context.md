# F3-gerente — Dashboard Gerente: Recibir y Distribuir Viajes

> ## ⚠️ DESACTUALIZADO — no implementar contra este archivo
>
> Describe un flujo de **asignación directa** que el contrato vigente ya no tiene.
> Lo que cambió, verificado contra `context/api-contracts/context.md`:
>
> - **Hay un paso obligatorio de reserva** entre ver el viaje y asignarlo. El gerente
>   primero reserva (`POST /api/viajes/:id/reservar`, estado `RESERVADO_POR_EMPRESA`,
>   `:2592`) y recién después asigna conductor y vehículo. Con timeout: la reserva se
>   suelta sola a los 10 minutos.
> - **El endpoint de la lista es otro.** No es `GET /api/viajes/disponibles` (ese es
>   del conductor) sino `GET /api/empresas/:id/viajes-disponibles` (`:2516`), que
>   filtra por elegibilidad de la flota de esa empresa.
> - `GET /api/viajes/:id` ahora también lo puede leer el gerente de la empresa dueña,
>   pero devuelve `403` mientras el viaje no esté reservado.
> - Los checkboxes de abajo están todos sin marcar aunque el código está escrito
>   (seis páginas bajo `app/(gerente)/`, ver `docs/PROYECTO.md` §6).
>
> Se deja tal cual, sin reescribir, como registro de lo que se planificó.
> Para trabajo nuevo usar `context/tasks/_PLANTILLA.md`.

## Prerequisito
F1-cliente completo. El login del gerente usa las mismas pantallas de auth — solo cambia el rol en el JWT.

## Objetivo
El gerente de empresa fletera puede ver los viajes disponibles en tiempo real, revisar los detalles de cada uno y asignarlo a un conductor y vehículo de su flota.

## Subtareas

### F3-0: Scaffold del área de gerente
- [ ] Layout en `/app/(gerente)/layout.tsx` con sidebar propio
- [ ] Items del sidebar: Viajes disponibles, Mis conductores, Mis vehículos
- [ ] El middleware redirige a este layout si el JWT tiene `tipo: GERENTE`
- [ ] Si intenta entrar un CLIENTE al área de gerente: redirigir a su dashboard

### F3-1: Dashboard principal del gerente — Viajes disponibles
Página `/app/(gerente)/page.tsx`

**Lista de viajes disponibles:**
- [ ] Cada card muestra: origen → destino, fecha y hora del viaje, tipo de zona (CABA/PROVINCIA/MIXTO), precio estimado, requisitos del vehículo necesario (íconos)
- [ ] Botón "Ver detalle y asignar" en cada card
- [ ] Los viajes se ordenan por fecha (más próximos primero)
- [ ] Si no hay viajes disponibles: estado vacío con mensaje claro

**Tiempo real:** cuando llega un nuevo viaje disponible vía Socket, aparece en la lista sin recargar la página (se agrega al tope con una animación suave).

**Endpoint:** `GET /api/viajes/disponibles`
**Evento Socket (escucha):** `viaje:disponible`

### F3-2: Detalle del viaje + asignación
Página `/app/(gerente)/viajes/[id]/page.tsx`

**Información del viaje:**
- [ ] Mapa estático (no en tiempo real) con origen, paradas y destino marcados
- [ ] Detalle completo: zona, fecha, precio estimado, requisitos del vehículo, lista de paradas con direcciones

**Formulario de asignación:**
- [ ] Selector de conductor: dropdown con los conductores de la empresa, muestra nombre y calificación promedio
- [ ] Selector de vehículo: dropdown filtrado por conductor seleccionado (solo vehículos que ese conductor puede usar) y por requisitos del viaje (solo vehículos que cumplen las condiciones requeridas)
- [ ] Botón "Asignar viaje" con loading state
- [ ] Al asignar exitosamente: mostrar confirmación y volver a la lista de viajes disponibles
- [ ] Si el viaje ya fue tomado por otro (race condition): mostrar error claro "Este viaje ya fue asignado"

**Endpoints:** `GET /api/viajes/:id`, `GET /api/empresas/:id/conductores`, `POST /api/viajes/:id/asignar`

### F3-3: Vista de conductores de la empresa
Página `/app/(gerente)/conductores/page.tsx`

- [ ] Tabla de conductores: nombre, calificación promedio, vehículos asignados, viajes completados (total histórico)
- [ ] Solo lectura en MVP — no agregar/quitar conductores desde el dashboard todavía

**Endpoint:** `GET /api/empresas/:id/conductores`

### F3-4: Conexión Socket.io para el gerente
- [ ] Al hacer login como gerente: conectarse al Socket y emitir `join:empresa` con el ID de la empresa
- [ ] Escuchar `viaje:disponible` → agregar el viaje al tope de la lista
- [ ] Desconectar al cerrar sesión

## Criterio de completitud
- El gerente ve la lista de viajes disponibles actualizada en tiempo real
- Puede asignar un conductor y vehículo a cualquier viaje disponible
- Si el viaje ya fue tomado al intentar asignar, recibe un error claro
- Puede ver la lista de sus conductores

## Archivos relevantes
- `/api-contracts/context.md` → sección Viajes Gerente y Eventos Socket F3
- `/model/context.md` → entidades Empresa, Conductor, Vehículo
- `/stack/context.md` → sección Socket.io
