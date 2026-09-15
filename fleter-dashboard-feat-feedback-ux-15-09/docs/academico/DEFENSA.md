# Defensa del proyecto — Fleter Dashboard

Guion paso a paso para defender el código. Está pensado para leerse en voz alta o
usarse como machete. Va de lo general a lo concreto.

---

## 0. La frase de arranque (30 segundos)

> "Fleter es un marketplace de fletes que conecta clientes que necesitan transportar
> carga, conductores y gerentes. Lo que yo hice es el **frontend web** (el panel/
> dashboard). No es toda la app: el backend es un servicio aparte que expone una API
> REST y WebSockets. Mi trabajo se conecta a ese backend, pero está desacoplado de él,
> tanto que puedo correr y demostrar toda la app **sin backend** gracias a un modo de
> datos de ejemplo."

Con esto ya dejás tres cosas claras: **qué** es, **qué parte hiciste vos** y que
**pensaste la arquitectura** (desacople frontend/backend).

---

## 1. El stack y por qué lo elegí

| Tecnología | Qué es | Por qué la elegí |
|---|---|---|
| **Next.js 16 (App Router)** | Framework de React | Ruteo por carpetas, renderizado en servidor y cliente, y me deja tener endpoints propios (BFF) en el mismo proyecto |
| **React 19 + TypeScript** | Librería de UI + tipado | Componentes reutilizables; TypeScript atrapa errores en tiempo de compilación, no en producción |
| **Firebase Auth** | Autenticación | No reinventé el login: delego identidad y contraseñas en un servicio probado (email/password + Google) |
| **Socket.io client** | Tiempo real | Para el seguimiento del viaje en vivo (posición del conductor) |
| **Google Maps** | Mapas | Mostrar rutas y paradas del viaje |
| **Vercel** | Hosting/deploy | Integración directa con Next.js y con GitHub |

**Regla de oro para el tribunal:** para cada elección, la respuesta nunca es "porque
sí". Siempre hay un motivo: *"elegí X porque prioricé A sobre B"*.

---

## 2. Cómo está organizado el código (el mapa)

Es una separación por responsabilidades:

- **`app/`** → las páginas y las rutas. Están agrupadas por rol de usuario usando
  *route groups* de Next: `(auth)`, `(cliente)`, `(conductor)`, `(gerente)`. Cada
  grupo tiene su propio layout.
- **`app/api/`** → mis propios endpoints (patrón **BFF**, ver punto 4).
- **`components/`** → piezas de UI reutilizables (mapa, selector de período, input de
  direcciones).
- **`hooks/`** → lógica reutilizable con estado (`useAuth`, `useSocket`,
  `useViajeActivo`, `usePeriodo`). Acá vive la "inteligencia" del frontend.
- **`lib/`** → utilidades sin estado: `api.ts` (cliente HTTP), `config.ts`,
  `firebase.ts`, `utils.ts` (formateos).
- **`__tests__/`** → tests unitarios y end-to-end.

> Idea a transmitir: **cada tipo de cosa tiene su lugar**. Si mañana hay que tocar el
> formateo de precios, sé exactamente dónde está (`lib/utils.ts`) y no está mezclado
> con la UI.

---

## 3. El flujo de autenticación (paso a paso)

Este es el flujo que más probablemente te pregunten. Va así:

1. El usuario entra su email y contraseña en `/login`.
2. **Firebase** valida las credenciales y me devuelve un **token** (un JWT).
3. Ese token lo guardo en una **cookie httpOnly** a través de mi endpoint
   `/api/auth/cookie`. Que sea `httpOnly` significa que **JavaScript del navegador no
   puede leerla** → protege contra robo de token por XSS. Además es `secure` en
   producción (solo viaja por HTTPS) y `sameSite: lax` (mitiga CSRF).
4. Con el token, le pido al backend el **perfil** del usuario (`/api/auth/me`), que
   incluye su **rol** (CLIENTE, CONDUCTOR, GERENTE).
5. Guardo `user`, `profile` y `role` en un **Context de React** (`useAuth`), así
   cualquier pantalla sabe quién está logueado sin volver a pedirlo.
6. Cada vez que llamo al backend, `lib/api.ts` adjunta automáticamente el token en el
   header `Authorization: Bearer ...`.

**Control de acceso:** cada layout de rol comprueba que haya sesión. Ejemplo en
`app/(cliente)/layout.tsx`: si termina de cargar y **no hay perfil, redirige a
`/login`**. Mientras carga no muestra nada (evita el "parpadeo" de contenido privado).

> Punto fuerte para destacar: **no guardo contraseñas en ningún lado**. Eso es
> responsabilidad de Firebase. Yo solo manejo un token de corta duración.

---

## 4. El patrón BFF (Backend For Frontend) — el punto técnico "estrella"

En `app/api/` tengo endpoints propios de Next.js (Route Handlers). El más
representativo es `app/api/analytics/cliente/resumen`.

**¿Por qué existe si ya hay un backend?** Porque el backend me devuelve la lista cruda
de viajes, pero el dashboard necesita **métricas agregadas** (total gastado, promedio,
viaje más caro, conteo por zona, datos para los gráficos...). En vez de calcular todo
eso en el navegador del usuario (lento y expone lógica), pongo una **capa intermedia**
que corre en el servidor:

1. Recibe el pedido del frontend.
2. Lee el token de la cookie.
3. Le pide los datos crudos al backend real.
4. **Agrega y transforma** (calcula totales, arma los datos de los gráficos).
5. Devuelve al frontend justo lo que la pantalla necesita, listo para pintar.

> Beneficios que podés mencionar: menos trabajo en el dispositivo del usuario, el
> token nunca se expone al navegador (viaja server-to-server), y si el backend cambia
> su formato solo toco esta capa, no todas las pantallas.

---

## 5. El modo MOCK — por qué es una decisión de diseño, no un truco

Todo el proyecto puede correr **sin backend ni Firebase**, con datos de ejemplo
(*fixtures*). Se activa con una variable de entorno: `NEXT_PUBLIC_MOCK=true`.

**Por qué lo hice (y por qué es una buena decisión de ingeniería):**

- **Desarrollo desacoplado:** puedo trabajar en el frontend aunque el backend esté
  caído o incompleto.
- **Demos reproducibles:** en la defensa puedo mostrar la app con datos consistentes,
  sin depender de la red ni de que el servidor esté vivo.
- **Testing:** los tests E2E corren en modo MOCK, así son **deterministas** (siempre
  los mismos datos → no fallan por causas externas).

Está implementado en un solo lugar central: `lib/api.ts` intercepta las llamadas y, si
`MOCK` está activo, devuelve los fixtures en vez de llamar a la red. La app **no se
entera**: el resto del código es idéntico en mock y en real. Eso es buen diseño: la
condición está aislada, no desparramada por toda la app.

---

## 6. Configuración y secretos

- Todo lo que cambia entre entornos (URL del backend, claves de Firebase/Maps) está en
  **variables de entorno**, no hardcodeado. Centralizado en `lib/config.ts`.
- Los secretos **no están en el historial de git**: `.gitignore:36` ignora `.env*` y
  `git log --all -- .env .env.local` no devuelve nada. Los valores de producción
  viven en Vercel.
- **Corrección (12-08-2026):** eso vale para el repositorio, **no para las máquinas
  del equipo**. En el checkout local hay credenciales en texto plano:
  `.env` tiene `DATABASE_URL`, `FIREBASE_PRIVATE_KEY` y `REDIS_URL`; `.env.local`
  tiene `NEXT_PUBLIC_FIREBASE_API_KEY` y `NEXT_PUBLIC_GOOGLE_MAPS_KEY`. Son archivos
  sin cifrar en disco: si se comparte la carpeta, se comparten las credenciales.
- En el CI uso *placeholders* para que el build sea determinista sin exponer nada.

> Frase: "Ningún secreto está commiteado: `.env*` está ignorado y no aparece en el
> historial. En las máquinas de desarrollo sí hay credenciales en texto plano, que es
> el riesgo que queda abierto."

---

## 7. Calidad: tests y CI/CD (si te preguntan por la parte de DevOps)

Estrategia = **pirámide de testing**, adaptada a que este frontend "no calcula, solo
muestra":

- **Muchos unit tests baratos** sobre la lógica pura de `lib/utils.ts` (formateo de
  precios, duraciones y fechas — lo que se ve en TODAS las pantallas). Herramienta:
  **Vitest** (rápido, casi sin config). La timezone se fija en la config para que las
  fechas den igual en cualquier máquina → tests **deterministas**.
- **Pocos tests E2E** sobre lo crítico: login y control de acceso. Herramienta:
  **Playwright** (levanta la app sola en modo MOCK y la maneja como un usuario real).

**Pipeline (GitHub Actions, `.github/workflows/ci.yml`):** en cada push/PR corre
**build + typecheck, lint, unit tests y E2E** en paralelo. El **deploy a producción
solo ocurre si todo pasó** y solo en la rama `main`. Es una **barrera de calidad**:
código roto no llega a producción.

**Flujo de ramas:** `feature/*` o `fix/*` → PR contra `development` → `development` se
mergea a `main` para publicar. (Esto demuestra que trabajaste con un flujo de Git
ordenado, no commiteando todo a `main`.)

---

## 8. Limitaciones conocidas (decilas vos antes de que las encuentren)

Ser honesto acá suma puntos:

- La **zona está hardcodeada a "CABA"** por ahora; el backend la va a calcular con
  Google Maps cuando esté esa integración.
- Algunos datos que dependen de Google Maps (precio real, duración real, km) muestran
  "—" mientras no haya viajes ejecutados de verdad.
- Hay pantallas marcadas como "Próx." (ej. Facturación): están planificadas pero no
  implementadas.
- El backend es externo: la calidad de punta a punta también depende de él, no solo de
  mi frontend.

> Cómo cerrarlo: *"Estas cosas las dejé conscientemente para una próxima iteración; lo
> importante es que la arquitectura ya las contempla y agregarlas no rompe lo demás."*

---

## 9. Preguntas típicas y respuestas cortas

- **¿Qué fue lo más difícil?** → Manejar el estado de autenticación de forma que
  funcione tanto con Firebase real como en modo mock, y que el control de acceso no
  muestre contenido privado ni por un instante.
- **¿Por qué Next.js y no React solo?** → Necesitaba ruteo, renderizado en servidor y
  poder tener mis propios endpoints (el BFF) sin montar otro proyecto aparte.
- **¿Cómo protegés las rutas privadas?** → Cada layout de rol verifica que haya sesión
  y redirige a `/login` si no; el token viaja en cookie httpOnly.
- **¿Cómo probaste que funciona?** → Tests unitarios de la lógica de formateo + E2E del
  login y el control de acceso, todo corriendo automáticamente en el CI antes de cada
  deploy.
- **¿Qué pasa si el backend falla?** → Las llamadas manejan el error (no rompen la
  app); y para desarrollo/demo tengo el modo mock que no depende del backend.
- **¿Por qué TypeScript?** → Para atrapar errores de tipos en compilación; el build del
  CI falla si hay un error de tipos, así que no llega a producción.

---

## 10. Cierre (lo que querés que les quede)

> "Resumiendo: hice el frontend de Fleter con Next.js y TypeScript, **desacoplado del
> backend** y organizado por responsabilidades. Puse una **capa BFF** para las
> métricas, resolví la **autenticación con Firebase y cookies seguras**, y me aseguré
> la calidad con **tests automáticos y un pipeline de CI/CD** que no deja deployar nada
> roto. Sé qué falta y por qué lo dejé para después."
</content>
</invoke>
