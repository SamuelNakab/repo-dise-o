import type { ReactNode } from "react";

// Cada página arma su propio `AuthShell` (components/AuthShell.tsx) porque el
// panel de marca y el ancho del formulario cambian entre login y registro.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
