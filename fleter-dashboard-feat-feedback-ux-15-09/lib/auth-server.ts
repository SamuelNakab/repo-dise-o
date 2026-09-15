import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { homeForRole, type Rol } from "./roles";

const API_URL =
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const MOCK = process.env.NEXT_PUBLIC_MOCK === "true";
const MOCK_ROLE = (process.env.NEXT_PUBLIC_MOCK_ROLE ?? "CLIENTE") as Rol;

/**
 * Perfil del usuario autenticado, tal como lo devuelve GET /api/auth/me.
 * Es la fuente de verdad server-side para los guards de rol.
 */
export interface SessionUser {
  id_usuario: number;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string | null;
  dni?: string;
  rol: Rol;
  fecha_registro?: string;
}

const MOCK_SESSION: SessionUser = {
  id_usuario: 1,
  nombre: "Joaquín",
  apellido: "Test",
  email: "joaco@fleter.com",
  telefono: "+5491112345678",
  dni: "30123456",
  rol: MOCK_ROLE,
  fecha_registro: "2026-01-15T00:00:00.000Z",
};

/**
 * Resuelve la sesión del usuario leyendo la cookie httpOnly `token` en el
 * servidor. En modo MOCK deriva el perfil de NEXT_PUBLIC_MOCK_ROLE. En modo
 * real verifica el token contra el backend (GET /api/auth/me).
 *
 * Devuelve `null` si no hay sesión válida (sin cookie, o token vencido/inválido).
 */
export async function getServerSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get("token")?.value;
  if (!token) return null;

  if (MOCK) {
    return MOCK_SESSION;
  }

  try {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as SessionUser;
  } catch {
    return null;
  }
}

/**
 * Guard server-side. Debe llamarse al tope de un layout/página que es Server
 * Component. Redirige ANTES de renderizar (sin flicker):
 *   - sin sesión → /login
 *   - rol distinto al permitido → home del propio rol
 * Devuelve el perfil cuando el acceso es válido.
 */
export async function requireRole(allow: Rol): Promise<SessionUser> {
  const session = await getServerSession();
  if (!session) redirect("/login");
  if (session.rol !== allow) redirect(homeForRole(session.rol));
  return session;
}
