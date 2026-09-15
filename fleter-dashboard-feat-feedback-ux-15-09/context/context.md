# context.md — Decisiones técnicas del Dashboard

> **Revisado el 19-08-2026.** Este archivo es el que `CLAUDE.md` llamaba
> `/stack/context.md`: esa carpeta no existe, el contenido está acá.
>
> Era el **plan original**, escrito antes de construir, y varias cosas se
> decidieron distinto al implementarlas. Lo verificado contra el código está marcado
> **[verificado 19-08]**; lo que quedó como plan no cumplido está marcado
> **[NO SE HIZO]** con lo que pasó en su lugar. No borré las decisiones viejas: sirven
> para entender por qué el código está como está.

## Framework: Next.js con App Router
- SSR para mejor carga inicial
- Rutas protegidas con middleware de Next.js (redirige a `/login` si no hay sesión)
- Deploy en Vercel

## Autenticación
- Firebase Auth: login, registro, Google OAuth
- JWT en **cookie httpOnly** (nunca localStorage)
- Middleware de Next.js verifica la cookie en cada ruta protegida
- **[NO SE HIZO]** el plan decía dos roles en el JWT (`CLIENTE` | `GERENTE`). Son
  **cuatro**: `CLIENTE`, `CONDUCTOR`, `GERENTE`, `ADMIN` (`lib/roles.ts:1`), con
  pantallas para los cuatro. El home de cada uno lo resuelve `homeForRole()`.
- **[verificado 19-08]** El sidebar y las rutas disponibles cambian según el rol
  (`components/shells/`, un shell por rol).

## Comunicación con el backend
| Canal | Cuándo |
|---|---|
| API REST (fetch/axios) | Todo el dashboard analítico, auth, datos históricos |
| Socket.io client | Solo en F2 (viaje activo) y F3 (gerente recibe viajes en tiempo real) |

- **[verificado 19-08]** Base URL backend: `NEXT_PUBLIC_API_URL` (`lib/config.ts:1`,
  default `http://localhost:3001`).
- **[NO SE HIZO]** `NEXT_PUBLIC_WS_URL` **no la lee ninguna línea de código**: los dos
  sockets se conectan a `BASE_URL` (`hooks/useSocket.ts`, `hooks/useViajeActivo.ts`).
  El CI la sigue declarando por inercia (`.github/workflows/ci.yml:35`). O se usa o se
  saca; hoy es ruido.

## Filtros de período (aplican a toda la capa analítica)
El usuario puede elegir entre tres modos:
- **Mensual:** selector de mes/año (ej: "Abril 2026")
- **Semanal:** selector de semana
- **Personalizado:** date picker de rango (fecha desde / fecha hasta)

El período seleccionado se manda al backend como query params: `?desde=ISO&hasta=ISO`

## Estilos
- **[NO SE HIZO]** el plan era Tailwind + una librería de componentes (shadcn/ui, MUI).
  **No hay ninguna de las dos**: no están en `package.json`. Los estilos son **CSS
  plano con custom properties** en `app/globals.css`. Tokens y convenciones:
  `context/design-system.md`.
- **[verificado 19-08]** Sin CSS modules ni styled-components.
- **[NO SE HIZO]** "Gráficos: no en MVP". Hay gráficos: `components/admin/Charts.tsx`,
  y el endpoint de analytics sirve series (`fletes_por_semana`).

## Variables de entorno
```
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_WS_URL=
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_GOOGLE_MAPS_KEY=       ← en uso: Google Places y el mapa del viaje activo
NEXT_PUBLIC_MOCK=                  ← true levanta la app sin backend ni Firebase
NEXT_PUBLIC_MOCK_ROLE=             ← CLIENTE | CONDUCTOR | GERENTE | ADMIN
```

**[NO SE HIZO]** `NEXT_PUBLIC_MP_PUBLIC_KEY` (MercadoPago) se sacó de esta lista: no
hay integración de pagos en el repo. El medio de cobro es `OPEN.md` → **D3, ABIERTA**.

## Estructura de carpetas
```
/app
  /layout.tsx
  /(auth)
    /login/page.tsx
    /registro/page.tsx
    /recuperar/page.tsx
  /(cliente)
    /layout.tsx                   → sidebar cliente, requiere rol CLIENTE
    /page.tsx                     → Dashboard analítico (F1)
    /viajes/page.tsx              → Listado de viajes con filtros
    /viajes/[id]/page.tsx         → Detalle de un viaje
    /viaje-activo/page.tsx        → Seguimiento en tiempo real (F2)
  /(gerente)
    /layout.tsx                   → sidebar gerente, requiere rol GERENTE
    /page.tsx                     → Viajes disponibles para distribuir (F3)
    /viajes/[id]/page.tsx         → Detalle + asignación de conductor/vehículo
    /estadisticas/page.tsx        → Stats históricas del gerente (F4)
/components
  /ui/                            → Botones, inputs, modales, tablas genéricas
  /analytics/                     → Cards de métricas, tabla de viajes
  /viajes/                        → Componentes de viaje (listado, detalle, estado)
  /gerente/                       → Componentes específicos del gerente
/lib
  /api.ts                         → Cliente HTTP con interceptores de auth
  /socket.ts                      → [NO SE HIZO] no existe. Hay dos conexiones
                                     Socket.io independientes: useSocket.ts y
                                     useViajeActivo.ts, cada una abre la suya
  /firebase.ts                    → Init Firebase
/hooks
  /useAuth.ts
  /usePeriodo.ts                  → Hook del filtro de período compartido
  /useSocket.ts                   → Solo para fases con tiempo real
/proxy.ts                         → Protección de rutas + redirección por rol.
                                     Next 16 renombró middleware.ts → proxy.ts
```

> La estructura de arriba es la **planificada**. La real difiere: los route groups son
> `(auth)`, `(cliente)`, `(conductor)`, `(gerente)`, `(admin)`; el panel del gerente
> cuelga de `/gerente/*` (seis páginas) y no de la raíz del grupo; y hay una capa BFF
> en `app/api/analytics/` que este plan no preveía. El árbol real está en
> `docs/PROYECTO.md` §3.
