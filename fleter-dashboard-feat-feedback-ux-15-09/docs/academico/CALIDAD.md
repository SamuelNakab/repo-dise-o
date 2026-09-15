# Calidad y Automatización — Fleter Dashboard

Documento de la estrategia de calidad del frontend de Fleter (Next.js 16 + React 19 +
TypeScript). Cubre qué se testea, con qué herramientas, cómo corre el pipeline de
CI/CD y qué deuda técnica queda pendiente.

> Referencia de la consigna: `TP3_-_DevOps.pdf`. Este documento sigue las secciones
> pedidas ahí. La última sección (uso de IA) la completa el equipo con sus palabras.

---

## 1. Estrategia general

La app es un frontend que **no calcula nada**: pide datos al backend y los muestra.
Por eso la estrategia prioriza dos cosas:

1. **Que la app siempre compile y deploye sana** → build + typecheck + lint como
   barrera obligatoria antes de cualquier deploy.
2. **Testear lo que el usuario realmente toca**, con la pirámide de testing:
   - Muchos **unit tests** baratos sobre lógica pura (formateo de datos que se ve en
     toda la UI).
   - Pocos **tests E2E** sobre los flujos críticos de punta a punta (autenticación y
     control de acceso), que son los que rompen "en serio".

Regla que guió los cambios de esta fase: **no cambiar el comportamiento visible de la
app**. Los arreglos de lint se hicieron preservando lo que el usuario ve.

---

## 2. Herramientas elegidas

| Necesidad | Elegimos | Por qué | Alternativa descartada |
|---|---|---|---|
| Unit testing | **Vitest** | Rapidísimo, casi sin configuración con Vite/Next 16 y TS, API compatible con Jest | **Jest** — más lento y más config (transformers de TS/ESM) |
| E2E | **Playwright** | Multi-browser real, auto-wait, levanta la app solo (`webServer`), veloz en CI | **Cypress** — más lento en CI y peor soporte multi-browser |
| Lint | **ESLint** (config de Next) | Ya venía con el proyecto; las reglas de `react-hooks` atrapan bugs reales | — |
| CI/CD | **GitHub Actions + Vercel CLI** | El repo ya está en GitHub y el hosting es Vercel; integración directa | Deploy manual / auto-deploy de Vercel sin gate de tests |

Detalle de config: `vitest.config.ts`, `playwright.config.ts`, `.github/workflows/ci.yml`.

---

## 3. Tests implementados

### Unit — `__tests__/unit/utils.test.ts` (funciones puras de `lib/utils.ts`)

Formateo de datos que aparece en todas las pantallas (precios, duraciones, fechas):

- `formatDuracion`: `null`/`undefined` → `"—"`; menor a 1h → `"45min"`; múltiplo de
  60 → `"2h"`; caso general → `"1h 35min"`.
- `formatARS`: separador de miles es-AR (`1500` → `"$1.500"`, `1234567` →
  `"$1.234.567"`, `0` → `"$0"`).
- `fmtDate` / `fmtDateTime` / `fmtTime`: formateo de fechas ISO. La timezone se fija
  en `vitest.config.ts` (`America/Argentina/Buenos_Aires`, UTC-3 todo el año) para que
  los resultados sean deterministas en cualquier máquina y en CI.

### E2E — `__tests__/e2e/auth.spec.ts` (Playwright, app en modo MOCK)

- **Login → Dashboard**: completar email/password en `/login`, ingresar, verificar
  redirect a `/`, que aparezca el header "Analytics" y que cargue una métrica
  ("Total gastado").
- **Ruta protegida sin sesión**: entrar directo a `/` sin cookie y verificar el
  redirect a `/login`.

Los E2E corren con `NEXT_PUBLIC_MOCK=true`: el login no valida credenciales reales y
los datos salen de fixtures, así que no hace falta backend ni Firebase.

---

## 4. Casos de uso críticos priorizados

Se priorizaron por **impacto si fallan**:

1. **Autenticación y control de acceso** (E2E). Si el login se rompe, nadie entra; si
   una ruta protegida deja de redirigir, se filtra contenido sin sesión. Es el borde
   más sensible de la app.
2. **Formateo de datos que ve el usuario** (unit). Precios, duraciones y fechas
   aparecen en todo el dashboard y el historial; un error de formato es visible al
   instante y afecta la confianza en los números.

> Nota de implementación: el redirect de ruta protegida es **client-side** (en
> `app/(cliente)/layout.tsx`), no en `proxy.ts` (que hoy es un no-op). El test E2E lo
> valida igual porque observa el cambio de URL en el navegador.

---

## 5. Pipeline de CI/CD

Definido en `.github/workflows/ci.yml`, corre en cada push y PR a `main` y
`development`. Jobs:

| Job | Qué hace | ¿Bloquea? |
|---|---|---|
| `build` | `next build` (incluye chequeo de TypeScript) | Sí |
| `lint` | `eslint` | Sí |
| `test` | `vitest run` (unit) | Sí |
| `test-e2e` | Playwright sobre la app en modo MOCK | Sí |
| `deploy` | Deploy a Vercel (`vercel pull/build/deploy --prebuilt --prod`) | Solo push a `main` |

**Por qué el deploy depende de todo lo anterior:** el job `deploy` declara
`needs: [build, lint, test, test-e2e]` y `if: push a main`. Es decir, a producción
**solo llega código que compila, pasa lint y pasa todos los tests**. Nunca se deploya
algo roto.

**Por qué el lint ahora es bloqueante:** antes el job de lint tenía
`continue-on-error: true` porque había 9 errores conocidos de `react-hooks`. En esta
fase se arreglaron los 9 (sin cambiar comportamiento) y se quitó esa línea, así el
lint es una barrera real como el resto del pipeline.

**Secrets necesarios en GitHub** (Settings → Secrets and variables → Actions):

```
VERCEL_ORG_ID      = team_JFyKzLS6qJmlv0gGB80rdZAM
VERCEL_PROJECT_ID  = prj_UjWPpoOFTnnkd87QiNXS8NPBpFpb
VERCEL_TOKEN       = (generar en Vercel → Account Settings → Tokens)
```

**Un solo camino de deploy:** Vercel tiene su propia integración con GitHub que
deploya automáticamente, pero lo hace *sin esperar* a los checks. Para que el deploy a
producción dependa de que pasen los tests, se desactiva el auto-deploy nativo en `main`
vía `vercel.json` (`git.deploymentEnabled.main = false`) y la producción la publica
únicamente el job `deploy` del pipeline. Los preview deploys de Vercel en los PRs se
mantienen (son útiles y no pisan producción).

---

## 6. Limitaciones y deuda técnica conocida

Se dejan explícitas, no ocultas:

- **No hay tests de los flujos de gerente ni de conductor.** Solo se cubrió el flujo
  de cliente (auth + dashboard).
- **No hay test del flujo real de creación de viaje** (`pedir-viaje`): requiere más
  fixtures y mockear Google Maps Places, queda como próximo paso.
- **Los E2E corren solo en modo MOCK**: validan la UI y el ruteo, no la integración
  real con el backend ni con Firebase.
- **`proxy.ts` es un no-op**: el control de acceso vive del lado del cliente. Migrarlo
  a middleware server-side sería más robusto (evitaría el flash de contenido).
- Quedan algunos **warnings de lint** (imports sin usar) que no bloquean; conviene
  limpiarlos.

---

## 7. Uso de IA

> **Completar por el equipo con sus propias palabras** (tiene que poder defenderse en
> la oral). Estructura sugerida:

- **Herramienta**: se usó Claude Code para asistir en esta fase.
- **Qué se generó con IA**: arreglos de los errores de lint de `react-hooks`, el setup
  de Vitest y Playwright, los tests (unit + E2E), el workflow de GitHub Actions y el
  borrador de esta documentación.
- **Qué se revisó/ajustó a mano**: _(completar)_ — p. ej. validación de que cada
  arreglo de lint no cambió el comportamiento, elección de los casos de test, revisión
  de los selectores de los E2E, y confirmación de los secrets/URL de Vercel.
- **Decisiones propias del equipo**: _(completar)_ — por qué estos casos críticos y no
  otros, qué se decidió dejar como deuda técnica.
