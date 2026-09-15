import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth-server";
import AdminShell from "@/components/shells/AdminShell";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("ADMIN");

  return <AdminShell user={user}>{children}</AdminShell>;
}
