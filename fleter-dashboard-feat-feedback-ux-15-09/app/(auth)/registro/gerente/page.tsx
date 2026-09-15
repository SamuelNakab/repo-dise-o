"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import AuthShell from "@/components/AuthShell";

export default function RegistroGerentePage() {
  const { registerGerente } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    dni: "",
    email: "",
    telefono: "",
    nombre_empresa: "",
    cuit_empresa: "",
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
      await registerGerente({
        ...form,
        telefono: form.telefono || undefined,
      });
      router.push("/gerente/empresa");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrarse");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      ancho
      titular={<>Tu flota, <em>siempre ocupada</em>.</>}
      bajada="Sumá tus vehículos y conductores y distribuí los viajes de tus clientes desde un panel."
      bullets={[
        "Flota y conductores afiliados en un solo lugar",
        "Asignación de viajes con el vehículo que corresponde",
        "Costo en vivo y remito de cada viaje",
      ]}
    >
      <Link href="/registro" className="btn btn--ghost back-link">
        <ArrowLeft size={14} /> Cambiar perfil
      </Link>
      <h1 className="auth-title">Registrá tu empresa fletera</h1>
      <p className="auth-subtitle">
        Creamos tu cuenta de gerente junto con la empresa y su código de afiliación.
      </p>

      <form onSubmit={handleSubmit}>
        <section className="form-section">
          <p className="form-section__title">Tus datos</p>
          <div className="form-grid">
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
            <div className="field">
              <label htmlFor="telefono">Teléfono <span className="opt">(opcional)</span></label>
              <input id="telefono" type="tel" placeholder="+54 9 11 1234-5678" value={form.telefono} onChange={set("telefono")} autoComplete="tel" />
            </div>
          </div>
        </section>

        <section className="form-section">
          <p className="form-section__title">Empresa</p>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="nombre_empresa">Nombre de la empresa</label>
              <input id="nombre_empresa" type="text" placeholder="Fletes del Sur SRL" value={form.nombre_empresa} onChange={set("nombre_empresa")} required autoComplete="organization" />
            </div>
            <div className="field">
              <label htmlFor="cuit_empresa">CUIT de la empresa</label>
              <input id="cuit_empresa" type="text" placeholder="30712345678" value={form.cuit_empresa} onChange={set("cuit_empresa")} required minLength={11} maxLength={13} />
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
