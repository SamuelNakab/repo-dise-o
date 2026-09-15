import Link from "next/link";

/**
 * Landing — placeholder a pedido (15-09): la landing real todavía no se
 * diseñó. Lo único funcional es el acceso al login, que antes no tenía
 * ninguna página pública que llevara a él.
 */
export default function LandingPage() {
  return (
    <main className="landing">
      <h1 className="landing__brand">
        <span>F</span>leter
      </h1>
      <p className="landing__sub">Landing page en desarrollo</p>
      <Link href="/login" className="landing__login">
        Iniciar sesión
      </Link>
    </main>
  );
}
