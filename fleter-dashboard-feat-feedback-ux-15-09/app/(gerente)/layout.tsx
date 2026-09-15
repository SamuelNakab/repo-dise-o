import type { ReactNode } from "react";
import { EmpresaProvider } from "@/hooks/useEmpresa";
import { requireRole } from "@/lib/auth-server";
import GerenteShell from "@/components/shells/GerenteShell";

export default async function GerenteLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("GERENTE");

  return (
    <EmpresaProvider>
      <GerenteShell user={user}>{children}</GerenteShell>
    </EmpresaProvider>
  );
}
