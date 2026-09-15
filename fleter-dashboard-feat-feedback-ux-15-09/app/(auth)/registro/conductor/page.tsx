"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import AuthShell from "@/components/AuthShell";
import Stepper, { PASOS_REGISTRO_CONDUCTOR } from "@/components/Stepper";

const HOY = new Date().toISOString().slice(0, 10);

/**
 * Registro del conductor en pasos. Los tres primeros son este formulario; el
 * cuarto (vehículo) es `/conductor/registro-vehiculo?onboarding=1`, que ya
 * necesita sesión. Sin vehículo el conductor no es elegible para ningún viaje
 * (contrato, `GET /api/viajes/disponibles`), por eso el vehículo es parte del
 * registro y no un "después".
 */
export default function RegistroConductorPage() {
  const { registerConductor } = useAuth();
  const router = useRouter();
  const [paso, setPaso] = useState(0);
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    dni: "",
    email: "",
    telefono: "",
    nro_licencia: "",
    licencia_vencimiento: "",
    password: "",
    password2: "",
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
    // La validación nativa solo ve los inputs del paso montado: los valores de
    // los otros pasos siguen en el estado.
    if (paso < 2) {
      setPaso(paso + 1);
      return;
    }
    if (form.password !== form.password2) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setLoading(true);
    try {
      await registerConductor({
        nombre: form.nombre,
        apellido: form.apellido,
        dni: form.dni,
        email: form.email,
        password: form.password,
        nro_licencia: form.nro_licencia,
        telefono: form.telefono || undefined,
        licencia_vencimiento: new Date(form.licencia_vencimiento).toISOString(),
      });
      router.push("/conductor/registro-vehiculo?onboarding=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrarse");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      ancho
      titular={<>Manejá tus viajes, <em>sin vueltas</em>.</>}
      bajada="Recibí viajes compatibles con tu vehículo, mirá el recorrido antes de salir y cerrá la entrega desde la app."
      bullets={[
        "Solo te llegan viajes que tu vehículo puede hacer",
        "Fecha, hora, recorrido y tarifa antes de aceptar",
        "Trabajá independiente o afiliado a una empresa fletera",
      ]}
    >
      <Link href="/registro" className="btn btn--ghost back-link">
        <ArrowLeft size={14} /> Cambiar perfil
      </Link>
      <h1 className="auth-title">Registrate como conductor</h1>
      <p className="auth-subtitle">Son cuatro pasos. Tu vehículo lo cargás al final.</p>

      <Stepper pasos={PASOS_REGISTRO_CONDUCTOR} actual={paso} />

      <form onSubmit={handleSubmit}>
        {paso === 0 && (
          <section className="form-section">
            <p className="form-section__title">Datos personales</p>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="nombre">Nombre</label>
                <input id="nombre" type="text" placeholder="Juan" value={form.nombre} onChange={set("nombre")} required autoFocus autoComplete="given-name" />
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
                <label htmlFor="telefono">Teléfono <span className="opt">(recomendado)</span></label>
                <input id="telefono" type="tel" placeholder="+54 9 11 1234-5678" value={form.telefono} onChange={set("telefono")} autoComplete="tel" />
                <span className="field__hint">Es el número que ve el cliente para coordinar la entrega.</span>
              </div>
            </div>
          </section>
        )}

        {paso === 1 && (
          <section className="form-section">
            <p className="form-section__title">Licencia de conducir</p>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="nro_licencia">Número de licencia</label>
                <input id="nro_licencia" type="text" placeholder="B1234567" value={form.nro_licencia} onChange={set("nro_licencia")} required autoFocus />
              </div>
              <div className="field">
                <label htmlFor="licencia_vencimiento">Vencimiento</label>
                <input id="licencia_vencimiento" type="date" min={HOY} value={form.licencia_vencimiento} onChange={set("licencia_vencimiento")} required />
                <span className="field__hint">Tiene que estar vigente.</span>
              </div>
            </div>
          </section>
        )}

        {paso === 2 && (
          <section className="form-section">
            <p className="form-section__title">Cuenta</p>
            <div className="form-grid">
              <div className="field form-grid__full">
                <label htmlFor="email">Email</label>
                <input id="email" type="email" placeholder="vos@email.com" value={form.email} onChange={set("email")} required autoFocus autoComplete="email" />
              </div>
              <div className="field">
                <label htmlFor="password">Contraseña</label>
                <input id="password" type="password" placeholder="Mínimo 8 caracteres" value={form.password} onChange={set("password")} required minLength={8} autoComplete="new-password" />
              </div>
              <div className="field">
                <label htmlFor="password2">Repetí la contraseña</label>
                <input id="password2" type="password" value={form.password2} onChange={set("password2")} required minLength={8} autoComplete="new-password" />
              </div>
            </div>
          </section>
        )}

        {error && <p className="auth-error">{error}</p>}

        <div className="form-actions">
          {paso > 0 ? (
            <button type="button" className="btn" onClick={() => { setError(""); setPaso(paso - 1); }} disabled={loading}>
              <ArrowLeft size={14} /> Atrás
            </button>
          ) : (
            <p className="auth-footer">
              ¿Ya tenés cuenta? <Link href="/login" className="auth-link">Iniciá sesión</Link>
            </p>
          )}
          <button type="submit" className="btn btn--primary btn--lg" disabled={loading}>
            {paso < 2 ? "Continuar" : loading ? "Creando cuenta..." : "Crear cuenta y cargar vehículo"}
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
