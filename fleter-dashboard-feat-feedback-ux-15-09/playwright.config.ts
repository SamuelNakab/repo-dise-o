import { defineConfig, devices } from "@playwright/test";

// E2E sobre la app en modo MOCK (NEXT_PUBLIC_MOCK=true): no necesita backend
// ni Firebase real. Ver lib/api.ts, hooks/useAuth.tsx y la API route
// app/api/analytics/cliente/resumen (todas tienen rama MOCK).
// Puerto propio de la suite: el 3000 lo suele ocupar otro proyecto.
const E2E_PORT = Number(process.env.E2E_PORT ?? 3123);
const E2E_URL = `http://localhost:${E2E_PORT}`;
const E2E_DIST = ".next-e2e";

export default defineConfig({
  testDir: "./__tests__/e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "line" : "list",
  use: {
    baseURL: E2E_URL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    // Build de producción en un distDir aparte, en vez de `next dev`, por dos
    // razones: Next 16 no deja correr un segundo dev server desde el mismo
    // directorio (chocaba con el `npm run dev` del desarrollador), y `--distDir`
    // evita pisar el `.next` normal con un build en modo MOCK.
    command: `npx next build && npx next start -p ${E2E_PORT}`,
    url: E2E_URL,
    // Nunca reutilizar lo que haya escuchando: así fue como la suite terminó
    // corriendo contra OTRA app que ocupaba el puerto 3000, con un error que
    // parecía un bug de esta app.
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      NEXT_PUBLIC_MOCK: "true",
      NEXT_PUBLIC_MOCK_ROLE: "CLIENTE",
      // Las NEXT_PUBLIC_* se inlinean en build, así que estas vars tienen que
      // estar puestas para el `next build`, no sólo para el `next start`.
      NEXT_DIST_DIR: E2E_DIST,
    },
  },
});
