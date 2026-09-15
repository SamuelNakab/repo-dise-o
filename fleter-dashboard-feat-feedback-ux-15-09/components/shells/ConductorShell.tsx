"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigation, ClipboardList, Truck, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import type { SessionUser } from "@/lib/auth-server";

const navItems = [
  { href: "/conductor",               label: "Viajes disponibles", Icon: Navigation,    tambien: [] as string[] },
  { href: "/conductor/mis-viajes",    label: "Mis viajes",         Icon: ClipboardList, tambien: ["/conductor/viajes/"] },
  { href: "/conductor/mis-vehiculos", label: "Mis vehículos",      Icon: Truck,         tambien: ["/conductor/registro-vehiculo"] },
];

export default function ConductorShell({
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

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand-header">
          <div className="brand-mark">F</div>
          <span className="brand-name">Fleter<em>.</em></span>
        </div>

        <nav className="sidebar__nav sidebar__nav--grow">
          {navItems.map(({ href, label, Icon, tambien }) => (
            <Link
              key={href}
              href={href}
              className={`nav-item${pathname === href || tambien.some((p) => pathname.startsWith(p)) ? " is-active" : ""}`}
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
                <p className="sidebar__conductor-role">Conductor</p>
              </div>
            </button>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar" />
        <main className="content">
          {children}
        </main>
      </div>
    </div>
  );
}
