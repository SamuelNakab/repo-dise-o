import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite que la suite e2e compile en su propio directorio
  // (`NEXT_DIST_DIR=.next-e2e`, ver playwright.config.ts) para no pisar el
  // `.next` de desarrollo con un build hecho en modo MOCK.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
};

export default nextConfig;
