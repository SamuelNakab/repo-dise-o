import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth-server";
import ConductorShell from "@/components/shells/ConductorShell";

export default async function ConductorLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("CONDUCTOR");

  return <ConductorShell user={user}>{children}</ConductorShell>;
}
