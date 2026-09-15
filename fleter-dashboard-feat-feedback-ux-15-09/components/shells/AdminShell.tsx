"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { BarChart2, Users, ClipboardList, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import type { SessionUser } from "@/lib/auth-server";

const navItems = [
  { href: "/admin",          label: "Estadísticas", Icon: BarChart2 },
  { href: "/admin/usuarios", label: "Usuarios",     Icon: Users },
  { href: "/admin/viajes",   label: "Viajes",       Icon: ClipboardList },
];

export default function AdminShell({
  user,
  children,
}: {
  user: SessionUser;
  children: ReactNode;
}) {
  const { profile, logout } = useAuth();
  const nombre = profile?.nombre ?? user.nombre;
  const apellido = profile?.apellido ?? user.apellido;

  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand-header">
          <div className="brand-mark">F</div>
          <span className="brand-name">Fleter<em>.</em></span>
          <span className="admin-badge">ADMIN</span>
        </div>

        <nav className="sidebar__nav sidebar__nav--grow">
          {navItems.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className={`nav-item${isActive(href) ? " is-active" : ""}`}
            >
              <Icon size={16} className="nav-item__icon" />
              <span className="nav-item__label">{label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar__profile-section">
          <div ref={menuRef} className="sidebar__user-anchor">
            {menuOpen && (
              <div className="sidebar__user-menu">
                <button
                  type="button"
                  className="sidebar__user-menu-item sidebar__user-menu-item--danger"
                  onClick={handleLogout}
                >
                  <LogOut size={14} />
                  Cerrar sesión
                </button>
              </div>
            )}
            <button
              type="button"
              className="sidebar__conductor-user sidebar__user--btn"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <div className="sidebar__conductor-avatar">
                {`${nombre[0]}${apellido[0]}`}
              </div>
              <div className="sidebar__user-info">
                <p className="sidebar__conductor-name">{nombre} {apellido}</p>
                <p className="sidebar__conductor-role">Administrador</p>
              </div>
            </button>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <p className="topbar__company">
            Panel de administración
          </p>
        </header>
        <main className="content">
          {children}
        </main>
      </div>
    </div>
  );
}
