import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Mismo alias que tsconfig.json: "@/..." apunta a la raíz del proyecto.
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    // Solo unit tests. Los E2E de Playwright viven en __tests__/e2e/ y los
    // corre Playwright, no Vitest.
    include: ["__tests__/unit/**/*.{test,spec}.{ts,tsx}"],
    // Timezone fija para que los tests de formateo de fechas sean deterministas
    // en cualquier máquina y en CI.
    env: {
      TZ: "America/Argentina/Buenos_Aires",
    },
  },
});
