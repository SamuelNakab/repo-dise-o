# TP3-devops — Pipeline de Calidad y CI/CD

## Qué es esta fase
TP universitario de Calidad y Automatización. No es una feature de producto: es
instrumentar el repo con testing automatizado, un pipeline de CI/CD que deployea a
Vercel solo si todo pasa, y documentación de las decisiones de calidad (`CALIDAD.md`).

Repo: `fleter-dashboard` (Next.js 16 + React 19 + TS). Ya existe `.github/workflows/ci.yml`
con jobs de build y lint — se extiende, no se reescribe de cero.

## Regla crítica de esta fase
No cambiar comportamiento de la app. Todo lo que se toca (lint fixes, config) debe
preservar el comportamiento visible actual. Si una tarea requiere elegir entre dos
formas de arreglar algo, preferir siempre la que menos toque el componente.

---

## Tarea 1 — Arreglar los 9 errores de lint y sacar `continue-on-error`

Estado actual: el job `lint` en `ci.yml` tiene `continue-on-error: true` porque hay
errores conocidos. Objetivo: 0 errores, y sacar esa línea para que el lint bloquee
como el resto del pipeline.

Los errores (confirmados corriendo `npx eslint .`), todos de las reglas nuevas de
`eslint-plugin-react-hooks` (React Compiler):

| Archivo | Línea | Regla | Qué está pasando |
|---|---|---|---|
| `components/AddressInput.tsx` | 38 | `react-hooks/set-state-in-effect` | `useEffect` sincroniza `value` (prop) → `inputValue` (state) llamando `setInputValue` directamente en el efecto |
| `hooks/useAuth.tsx` | 113 | `react-hooks/set-state-in-effect` | En modo MOCK, el efecto de montaje lee `document.cookie` y llama `setState(...)` sincrónicamente |
| `hooks/useSocket.ts` | 46 | `react-hooks/refs` (x2, mismo lugar) | El hook devuelve `socketRef.current` directo en el `return` del render |
| `hooks/useViajeActivo.ts` | 106 | `react-hooks/set-state-in-effect` | `setLoading(true)` llamado al inicio de un efecto antes del fetch |
| `hooks/useViajeActivo.ts` | 148 | `react-hooks/set-state-in-effect` | `setUltimaPos(...)` llamado sincrónicamente al arrancar la simulación de GPS mock |

Patrones de fix recomendados (aplicar el que corresponda a cada caso, revisando el
archivo completo antes de tocar nada):

- **Sync de prop → state en efecto** (`AddressInput.tsx`): en vez de comparar y
  hacer `setState` en un efecto, resetear el estado con un patrón de "derivar
  durante el render" (guardar el prop anterior en un `useRef`/state y comparar
  en el cuerpo del componente, no en un efecto) — es el patrón que documenta
  React para "Adjusting state when a prop changes".
- **Estado inicial que depende de algo externo (cookie, storage)** (`useAuth.tsx`):
  mover la lectura de `document.cookie` a un *lazy initializer* de `useState`
  (`useState(() => ...)`) en vez de setearlo en un efecto de montaje. Ojo: el
  resto de ese mismo efecto (el `onIdTokenChanged` de Firebase) sigue siendo un
  efecto legítimo — solo se saca la rama MOCK del efecto.
- **Devolver un ref en el render** (`useSocket.ts`): guardar el socket también en
  `useState` (o exponerlo solo dentro de callbacks/efectos, nunca en el valor de
  retorno leído durante render). La forma más simple: en vez de `socketRef`,
  usar `useState<Socket | null>(null)` para el valor que se expone, y seguir
  usando un ref interno solo si hace falta evitar recreaciones.
- **`setLoading(true)` al inicio de un efecto de fetch** (`useViajeActivo.ts:106`):
  inicializar `loading` en `true` como valor por defecto de `useState(true)` en
  vez de setearlo dentro del efecto.
- **Simulación de GPS mock** (`useViajeActivo.ts:148`): mover el valor inicial de
  `ultimaPos` a la inicialización de `useState`, y dejar que el efecto solo
  arranque el `setInterval` que actualiza valores subsiguientes.

Validar con `npm run lint` (debe salir limpio) y `npm run build` (no debe romperse
el build). Después, en `ci.yml`, borrar la línea `continue-on-error: true` del job
`lint` y actualizar el comentario del step (ya no hay errores conocidos pendientes).

---

## Tarea 2 — Setup de Vitest

- Instalar: `vitest`, `@vitejs/plugin-react` (o el plugin que corresponda para Next),
  `jsdom` como devDependencies.
- Crear `vitest.config.ts` en la raíz, entorno `jsdom`, alias `@` apuntando a la raíz
  del proyecto (mismo alias que usa `tsconfig.json`).
- Agregar script en `package.json`: `"test": "vitest run"`.
- Carpeta de tests: `__tests__/unit/` (ya está excluida en `.claudeignore`, respetar
  esa convención).

## Tarea 3 — Unit tests sobre `lib/utils.ts`

Mínimo 3-4 tests, todos sobre funciones puras ya existentes (no hace falta mockear
nada):

- `formatDuracion`: casos `null`/`undefined` → `"—"`; menor a 60 min → `"Xmin"`;
  múltiplo exacto de 60 → `"Xh"`; caso general → `"Xh Ymin"`.
- `formatARS`: formatea con separador de miles es-AR (ej. `1500` → `"$1.500"`).
- `fmtDate` / `fmtDateTime` / `fmtTime`: al menos un caso cada una con una fecha ISO
  fija, verificando el formato de salida.

Cada test debe indicar en su descripción (`it("...")`) qué caso de uso cubre, en
español, para que sea directo pegarlo después en `CALIDAD.md`.

## Tarea 4 — Setup de Playwright

- Instalar `@playwright/test`.
- `playwright.config.ts`: `baseURL: http://localhost:3000`, `webServer` que levanta
  `npm run dev` (o `next start` sobre un build) con las env vars:
  ```
  NEXT_PUBLIC_MOCK=true
  NEXT_PUBLIC_MOCK_ROLE=CLIENTE
  ```
  (con `MOCK=true` no hace falta backend ni Firebase real — ver `lib/api.ts` y
  `hooks/useAuth.tsx`).
- Carpeta: `__tests__/e2e/`.
- Script: `"test:e2e": "playwright test"`.

## Tarea 5 — Tests E2E (2 flujos)

1. **Login → Dashboard**: ir a `/login`, completar email/password (cualquier valor,
   en modo MOCK no valida), submit, esperar redirect a `/`, verificar que aparece el
   texto "Analytics" (header del dashboard) y que carga al menos una métrica.
2. **Ruta protegida sin sesión → redirect a /login**: ir directo a `/` sin cookie de
   sesión, verificar que termina en `/login`.

## Tarea 6 — Completar `.github/workflows/ci.yml`

Mantener los jobs existentes (`build`, `lint` ya sin `continue-on-error`) y agregar:

- **Job `test`**: `npm ci` → `npm run test` (Vitest). Correr en paralelo a `build`/`lint`
  si no hay dependencia real entre ellos (no hace falta que `test` espere a `build`).
- **Job `test-e2e`**: instalar browsers de Playwright (`npx playwright install --with-deps chromium`
  alcanza, no hace falta instalar los 3 motores) → `npm run test:e2e`. Usar las mismas
  env vars mock que en la Tarea 4.
- **Job `deploy`**: `needs: [build, lint, test, test-e2e]`, solo corre en push a `main`
  (no en PRs ni en `development`). Usa `amondnet/vercel-action` o el `vercel` CLI
  directo (`vercel pull`, `vercel build`, `vercel deploy --prebuilt --prod`) con:
  ```yaml
  env:
    VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
    VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
    VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
  ```

Secrets a configurar en GitHub (Settings → Secrets and variables → Actions) —
los valores de org/project ya están confirmados, el token lo genera Joaquín en
Vercel → Account Settings → Tokens:
```
VERCEL_ORG_ID = team_JFyKzLS6qJmlv0gGB80rdZAM
VERCEL_PROJECT_ID = prj_UjWPpoOFTnnkd87QiNXS8NPBpFpb
VERCEL_TOKEN = <generar en Vercel, pegar el valor tal cual>
```

## Tarea 7 — README.md

Reemplazar el contenido default de `create-next-app` por:
- Qué es el proyecto (2-3 líneas, puede tomarse de `PROYECTO.md`).
- Cómo correr en local (`npm install`, `npm run dev`, mencionar `NEXT_PUBLIC_MOCK=true`
  para desarrollar sin backend).
- Cómo correr los tests: `npm run test` (unit) y `npm run test:e2e` (E2E).
- Convención de branches: `feature/nombre-feature`, `fix/nombre-bug`, PRs contra
  `development`, merge a `main` para producción (ajustar si el flujo real es otro —
  confirmar mirando qué branches dispara el `ci.yml` actual: `main` y `development`).
- URL de producción (la de Vercel, una vez que el deploy esté andando).

## Tarea 8 — PR template

Crear `.github/PULL_REQUEST_TEMPLATE.md` con checklist simple: qué issue resuelve
(`closes #`), qué se probó, si rompe algo existente, screenshot si es cambio visual.

## Tarea 9 — `CALIDAD.md`

Documento en la raíz, escrito para que el equipo lo pueda defender oralmente. Secciones
obligatorias (ver TP3_-_DevOps.pdf para el detalle exacto de qué pide cada una):

- Estrategia general y por qué.
- Herramientas elegidas (Vitest sobre Jest — más rápido, menos config con Next 16;
  Playwright sobre Cypress — mejor soporte multi-browser y más rápido en CI) y
  alternativas descartadas.
- Listado de los tests implementados (unit + E2E) con qué caso de uso valida cada uno.
- Casos de uso críticos priorizados y por qué (auth + acceso a rutas protegidas,
  formateo de datos que el usuario ve en toda la app).
- Descripción del pipeline: por qué el deploy depende de todo lo anterior, por qué
  el lint ahora es bloqueante.
- Limitaciones y deuda técnica conocida: no hay tests de los flujos de gerente/conductor
  todavía, no hay test del flujo real de creación de viaje (`pedir-viaje`) porque
  requiere más fixtures — dejarlo como próximo paso, no ocultarlo.
- Sección de uso de IA: mencionar que se usó Claude Code para generar tests y el
  pipeline, qué se generó y qué se revisó/ajustó a mano.

Esta última sección la completa el equipo con sus propias palabras — Claude Code puede
dejar la estructura y un borrador, pero las decisiones tienen que poder explicarlas
en la defensa oral.