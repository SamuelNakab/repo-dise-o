import Link from "next/link";
import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";

const BULLETS_DEFAULT = [
  "Coordiná tus fleteros y los que te falten desde un solo lugar",
  "Seguimiento en vivo y alertas de desvío en cada viaje",
  "Remito y comprobante de entrega al cerrar",
];

/**
 * Layout de las pantallas de auth: panel de marca a la izquierda y formulario a
 * la derecha. Reemplaza la tarjeta centrada de 400px, que en desktop se veía
 * como una app mobile estirada. Debajo de 900px colapsa a una columna.
 */
export default function AuthShell({
  children,
  titular = <>Los fletes de tu PyME, <em>bajo control</em>.</>,
  bajada = "Fleter administra tu flota propia y te consigue transportistas verificados cuando no das abasto.",
  bullets = BULLETS_DEFAULT,
  ancho = false,
}: {
  children: ReactNode;
  titular?: ReactNode;
  bajada?: string;
  bullets?: string[];
  ancho?: boolean;
}) {
  return (
    <div className="auth-split">
      <aside className="auth-split__aside">
        <Link href="/" className="auth-brand">
          <div className="brand-mark">F</div>
          <span className="brand-name">Fleter<em>.</em></span>
        </Link>
        <div className="auth-split__intro">
          <h2 className="auth-split__headline">{titular}</h2>
          <p className="auth-split__lead">{bajada}</p>
          <ul className="auth-split__bullets">
            {bullets.map((b) => (
              <li key={b}>
                <CheckCircle2 size={18} />
                {b}
              </li>
            ))}
          </ul>
        </div>
        <p className="auth-split__foot">© {new Date().getFullYear()} Fleter</p>
      </aside>
      <main className="auth-split__main">
        <div className={`auth-split__panel${ancho ? " auth-split__panel--ancho" : ""}`}>
          <Link href="/" className="auth-brand auth-split__mobile-brand">
            <div className="brand-mark">F</div>
            <span className="brand-name">Fleter<em>.</em></span>
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}
