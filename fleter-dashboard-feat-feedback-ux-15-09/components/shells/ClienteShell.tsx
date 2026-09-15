"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { formatARS, fmtDate } from "@/lib/utils";
import { ESTADO_LABEL_ACTIVO, esEnCurso } from "@/lib/estados";
import { BarChart2, ClipboardList, Truck, FileText, User, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import type { SessionUser } from "@/lib/auth-server";

interface RecentViaje {
  id_viaje: number;
  precio_real: number | null;
  precio_estimado: number;
  fecha_programada: string;
  creado_en: string;
  estado: string;
  paradas: { orden: number; direccion: string }[];
}

const ACTIVE_ESTADO_LABELS: Record<string, string> = {
  ...ESTADO_LABEL_ACTIVO,
  CARGANDO: "Cargando mercadería",
};

export default function ClienteShell({
  user,
  children,
}: {
  user: SessionUser;
  children: ReactNode;
}) {
  // El guard server-side (requireRole) ya garantizó la sesión y el rol antes
  // de renderizar. Usamos `user` (resuelto en el servidor) como identidad
  // estable y `useAuth` solo para empresa (si está) y para cerrar sesión.
  const { profile, logout } = useAuth();
  const nombre = profile?.nombre ?? user.nombre;
  const apellido = profile?.apellido ?? user.apellido;
  const empresa = profile?.empresa ?? "";

  const pathname = usePathname();
  const router = useRouter();

  const [recentViajes, setRecentViajes] = useState<RecentViaje[]>([]);
  const [totalViajes, setTotalViajes] = useState(0);
  const [activeViajes, setActiveViajes] = useState<RecentViaje[]>([]);
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

  useEffect(() => {
    api.get<RecentViaje[]>("/api/viajes/mis-viajes")
      .then((data) => {
        setTotalViajes(data.length);
        // "En curso" = físicamente arrancado. Un viaje aceptado para otro día
        // no es un viaje en curso (antes CONDUCTOR_ASIGNADO prendía el banner).
        const active = data.filter((v) => esEnCurso(v.estado));
        setActiveViajes(active);
        const sorted = [...data].sort((a, b) => {
          const da = new Date(a.fecha_programada ?? a.creado_en).getTime();
          const db = new Date(b.fecha_programada ?? b.creado_en).getTime();
          return db - da;
        });
        setRecentViajes(sorted.slice(0, 5));
      })
      .catch(() => {});
  }, []);

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <div className="app">
      <aside className="sidebar">
        {/* Brand */}
        <div className="brand-header">
          <div className="brand-mark">F</div>
          <span className="brand-name">Fleter<em>.</em></span>
        </div>

        {/* CTA */}
        <Link href="/pedir-viaje" className="sidebar__new">
          <span className="sidebar__new-plus">+</span>
          Solicitar nuevo flete
        </Link>

        {/* Nav */}
        <nav className="sidebar__nav">
          {[
            { href: "/panel",       label: "Analytics",    Icon: BarChart2,     suffix: undefined as string | undefined, disabled: false },
            { href: "/viajes",      label: "Record",       Icon: ClipboardList, suffix: undefined as string | undefined, disabled: false },
            {
              href: activeViajes.length === 1
                ? `/viaje-activo?id=${activeViajes[0].id_viaje}`
                : "/viaje-activo",
              label: "En curso",
              Icon: Truck,
              suffix: activeViajes.length === 0 ? "Ninguno" as string | undefined : undefined,
              disabled: activeViajes.length === 0,
            },
            { href: "/facturacion", label: "Facturación",  Icon: FileText,      suffix: undefined as string | undefined, disabled: false },
          ].map(({ href, label, Icon, suffix, disabled }) => {
            const isActive = pathname === href || (label === "En curso" && pathname === "/viaje-activo");
            const showBadge = href === "/viajes" && totalViajes > 0;
            if (disabled) {
              return (
                <span key={label} className="nav-item nav-item--disabled">
                  <Icon size={16} className="nav-item__icon" />
                  <span className="nav-item__label">{label}</span>
                  <span className="nav-item__suffix">{suffix}</span>
                </span>
              );
            }
            return (
              <Link key={label} href={href} className={`nav-item${isActive ? " is-active" : ""}`}>
                <Icon size={16} className="nav-item__icon" />
                <span className="nav-item__label">{label}</span>
                {showBadge && <span className="nav-item__badge">{totalViajes}</span>}
                {label === "En curso" && activeViajes.length > 0 && (
                  <span className="nav-item__live-dot" />
                )}
                {suffix && !showBadge && <span className="nav-item__suffix">{suffix}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Viajes recientes */}
        {recentViajes.length > 0 && (
          <div className="sidebar__recent">
            <p className="sidebar__recent-title">Viajes recientes</p>
            {recentViajes.map((v) => {
              const destino =
                v.paradas.length > 0
                  ? v.paradas.reduce((max, p) => (p.orden > max.orden ? p : max), v.paradas[0])?.direccion
                  : "—";
              const precio = v.precio_real ?? v.precio_estimado;
              const fecha = fmtDate(v.fecha_programada ?? v.creado_en);
              return (
                <Link key={v.id_viaje} href={`/viajes/${v.id_viaje}`} className="sidebar__recent-item">
                  <span className="sidebar__recent-dest">{destino}</span>
                  <span className="sidebar__recent-meta">
                    {fecha} · {precio != null ? formatARS(precio) : "—"}
                  </span>
                </Link>
              );
            })}
          </div>
        )}

        {/* User card */}
        <div ref={menuRef} className="sidebar__profile-section">
          {menuOpen && (
            <div className="sidebar__user-menu">
              <Link
                href="/perfil"
                className="sidebar__user-menu-item"
                onClick={() => setMenuOpen(false)}
              >
                <User size={14} />
                Mi perfil
              </Link>
              <div className="sidebar__user-menu-sep" />
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
            className="sidebar__user sidebar__user--btn"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <div className="sidebar__user-avatar">
              {`${nombre[0]}${apellido[0]}`}
            </div>
            <div className="sidebar__user-info">
              <p className="sidebar__user-name">{nombre} {apellido}</p>
              {/*
                El nombre de la empresa sale del perfil de Firebase (cliente),
                no de la sesión del server: `GET /api/auth/me` no lo devuelve.
                El server renderiza vacío y el cliente lo completa, así que la
                diferencia en la hidratación es esperada — sin esto React tira
                un error de hidratación y regenera todo el árbol.
              */}
              <p className="sidebar__user-empresa" suppressHydrationWarning>{empresa}</p>
            </div>
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          {/* Client-only, igual que en el sidebar: ver comentario de arriba. */}
          <p className="topbar__company" suppressHydrationWarning>{empresa}</p>
        </header>
        {activeViajes.length > 0 && (
          <Link
            href={
              activeViajes.length === 1
                ? `/viaje-activo?id=${activeViajes[0].id_viaje}`
                : "/viaje-activo"
            }
            className="active-trip-banner"
          >
            <span className="active-trip-banner__dot" />
            <span className="active-trip-banner__text">
              {activeViajes.length === 1 ? (
                <>
                  <strong>Viaje en curso</strong>
                  {" · "}
                  {ACTIVE_ESTADO_LABELS[activeViajes[0].estado] ?? activeViajes[0].estado.replace(/_/g, " ")}
                  {activeViajes[0].paradas.length > 0 && (
                    <> · Destino: {activeViajes[0].paradas.reduce((m, p) => p.orden > m.orden ? p : m, activeViajes[0].paradas[0]).direccion}</>
                  )}
                </>
              ) : (
                <><strong>{activeViajes.length} viajes en curso</strong> · Hacé click para verlos</>
              )}
            </span>
            <span className="active-trip-banner__cta">Ver seguimiento →</span>
          </Link>
        )}
        <main className="content">
          {children}
        </main>
      </div>
    </div>
  );
}
