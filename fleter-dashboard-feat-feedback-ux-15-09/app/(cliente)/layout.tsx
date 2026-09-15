import type { ReactNode } from "react";
import { PeriodoProvider } from "@/hooks/usePeriodo";
import { requireRole } from "@/lib/auth-server";
import ClienteShell from "@/components/shells/ClienteShell";

export default async function ClienteLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("CLIENTE");

  return (
    <PeriodoProvider>
      <ClienteShell user={user}>{children}</ClienteShell>
    </PeriodoProvider>
  );
}
