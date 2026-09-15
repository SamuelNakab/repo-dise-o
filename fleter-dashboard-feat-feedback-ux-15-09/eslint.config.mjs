import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    // Build de la suite e2e (ver playwright.config.ts), también generado.
    ".next-e2e/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // No forman parte de la app Next: prototipos de referencia y app móvil separada.
    "context/prototype/**",
    "fleter-mobile-master/**",
  ]),
]);

export default eslintConfig;
