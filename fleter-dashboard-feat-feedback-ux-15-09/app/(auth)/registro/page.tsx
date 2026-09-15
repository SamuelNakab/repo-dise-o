"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Truck, Warehouse, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import AuthShell from "@/components/AuthShell";

export default function RegistroPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [perfil, setPerfil] = useState<"pyme" | null>(null);
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    dni: "",
    email: "",
    empresa: "",
    cuit: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form);
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrarse");
    } finally {
      setLoading(false);
    }
  }

  if (!perfil) {
    return (
      <AuthShell ancho>
        <h1 className="auth-title">Creá tu cuenta</h1>
        <p className="auth-subtitle">Elegí cómo vas a usar Fleter. Cada perfil tiene su propio panel.</p>

        <div className="option-cards option-cards--grandes">
          <button type="button" className="option-card" onClick={() => setPerfil("pyme")}>
            <span className="option-card__icon"><Building2 size={22} /></span>
            <span className="option-card__title">Soy una PyME</span>
            <span className="option-card__desc">Pido fletes, sigo mis envíos y veo cuánto gasto por mes.</span>
          </button>
          <Link href="/registro/conductor" className="option-card">
            <span className="option-card__icon"><Truck size={22} /></span>
            <span className="option-card__title">Soy conductor</span>
            <span className="option-card__desc">Hago viajes con mi vehículo, propio o de una empresa fletera.</span>
          </Link>
          <Link href="/registro/gerente" className="option-card">
            <span className="option-card__icon"><Warehouse size={22} /></span>
            <span className="option-card__title">Tengo una empresa fletera</span>
            <span className="option-card__desc">Administro flota y conductores y distribuyo los viajes.</span>
          </Link>
        </div>

        <p className="auth-footer" style={{ marginTop: 32 }}>
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="auth-link">Iniciá sesión</Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell ancho>
      <button type="button" className="btn btn--ghost back-link" onClick={() => setPerfil(null)}>
        <ArrowLeft size={14} /> Cambiar perfil
      </button>
      <h1 className="auth-title">Cuenta para tu PyME</h1>
      <p className="auth-subtitle">Con esto ya podés pedir tu primer flete.</p>

      <form onSubmit={handleSubmit}>
        <section className="form-section">
          <p className="form-section__title">Tus datos</p>
          <div className="form-grid form-grid--3">
            <div className="field">
              <label htmlFor="nombre">Nombre</label>
              <input id="nombre" type="text" placeholder="Juan" value={form.nombre} onChange={set("nombre")} required autoComplete="given-name" />
            </div>
            <div className="field">
              <label htmlFor="apellido">Apellido</label>
              <input id="apellido" type="text" placeholder="García" value={form.apellido} onChange={set("apellido")} required autoComplete="family-name" />
            </div>
            <div className="field">
              <label htmlFor="dni">DNI</label>
              <input id="dni" type="text" inputMode="numeric" placeholder="12345678" value={form.dni} onChange={set("dni")} required minLength={7} maxLength={9} pattern="\d{7,9}" />
            </div>
          </div>
        </section>

        <section className="form-section">
          <p className="form-section__title">Empresa</p>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="empresa">Razón social</label>
              <input id="empresa" type="text" placeholder="Mi PyME S.A." value={form.empresa} onChange={set("empresa")} required autoComplete="organization" />
            </div>
            <div className="field">
              <label htmlFor="cuit">CUIT</label>
              <input id="cuit" type="text" placeholder="30-12345678-9" value={form.cuit} onChange={set("cuit")} required />
            </div>
          </div>
        </section>

        <section className="form-section">
          <p className="form-section__title">Acceso</p>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" placeholder="vos@empresa.com" value={form.email} onChange={set("email")} required autoComplete="email" />
            </div>
            <div className="field">
              <label htmlFor="password">Contraseña</label>
              <input id="password" type="password" placeholder="Mínimo 8 caracteres" value={form.password} onChange={set("password")} required minLength={8} autoComplete="new-password" />
            </div>
          </div>
        </section>

        {error && <p className="auth-error">{error}</p>}

        <div className="form-actions">
          <p className="auth-footer">
            ¿Ya tenés cuenta? <Link href="/login" className="auth-link">Iniciá sesión</Link>
          </p>
          <button type="submit" className="btn btn--primary btn--lg" disabled={loading}>
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
