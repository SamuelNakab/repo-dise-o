export type Rol = "CLIENTE" | "CONDUCTOR" | "GERENTE" | "ADMIN";

/**
 * Ruta home de cada rol tras iniciar sesión. Usada por el login y por el
 * guard server-side (requireRole) para redirigir a un usuario a su propio
 * panel cuando intenta entrar al de otro rol.
 */
export function homeForRole(role: string): string {
  if (role === "CONDUCTOR") return "/conductor";
  if (role === "GERENTE") return "/gerente";
  if (role === "ADMIN") return "/admin";
  return "/panel"; // CLIENTE — `/` es la landing pública desde el 15-09
}
