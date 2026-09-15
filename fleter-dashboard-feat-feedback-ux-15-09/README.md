# Fleter Dashboard

Panel web de **Fleter**, que administra los fletes de una PyME: los suyos y los que le
falten. El cliente registra sus propios fleteros y Fleter se encarga de coordinación,
seguimiento, documentación y liquidación; cuando su flota no da abasto, la app le
consigue transportistas verificados. Este repo es el **frontend** (Next.js 16 +
React 19 + TypeScript); el backend es un servicio externo que expone una API REST +
WebSockets (Socket.io para el tiempo real).

Decisiones de producto abiertas y cerradas: [`OPEN.md`](./OPEN.md) — se lee antes que
cualquier otra cosa. Estado real de cada feature: [`ESTADO-REAL.md`](./ESTADO-REAL.md).

## Correr en local

```bash
npm install
npm run dev
```

La app queda en http://localhost:3000.

Para desarrollar **sin backend ni Firebase** (datos de ejemplo), usar el modo MOCK:

```bash
NEXT_PUBLIC_MOCK=true NEXT_PUBLIC_MOCK_ROLE=CLIENTE npm run dev
```

En modo MOCK el login no valida credenciales y las pantallas se alimentan de fixtures
(ver `lib/api.ts`, `hooks/useAuth.tsx` y las ramas MOCK de las API routes).
`NEXT_PUBLIC_MOCK_ROLE` puede ser `CLIENTE`, `CONDUCTOR`, `GERENTE` o `ADMIN`
(los cuatro roles de `lib/roles.ts`).

## Tests

```bash
npm test          # unit tests (Vitest)
npm run test:e2e  # tests end-to-end (Playwright, levanta la app en modo MOCK)
```

La primera vez, instalar el navegador de Playwright: `npx playwright install chromium`.

Detalle de la estrategia de calidad, casos cubiertos y pipeline:
[`docs/academico/CALIDAD.md`](./docs/academico/CALIDAD.md). Es material de defensa de
un TP: describe el pipeline correctamente, pero repite afirmaciones sobre el producto
que ya no son ciertas.

## Flujo de trabajo (branches)

- Ramas de trabajo: `feature/nombre-feature` o `fix/nombre-bug`.
- Los Pull Requests van contra `development`.
- `development` se mergea a `main` para publicar a producción.
- El pipeline de CI corre en cada push/PR a `main` y `development`; el **deploy a
  producción solo ocurre en push a `main`** y únicamente si build, lint, unit tests
  y E2E pasaron (ver `.github/workflows/ci.yml`).

## Producción

Deploy en Vercel (proyecto `fleter`): https://fleter-mu.vercel.app
