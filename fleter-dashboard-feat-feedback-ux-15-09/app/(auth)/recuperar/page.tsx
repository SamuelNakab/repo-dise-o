"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, MailCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import AuthShell from "@/components/AuthShell";

export default function RecuperarPage() {
  const { sendRecovery } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await sendRecovery(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar el email");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      {sent ? (
        <div>
          <div className="empty-state__icon empty-state__icon--ok">
            <MailCheck size={24} />
          </div>
          <h1 className="auth-title">Revisá tu casilla</h1>
          <p className="auth-subtitle" style={{ lineHeight: 1.5 }}>
            Te mandamos un link a <strong>{email}</strong> para
            restablecer tu contraseña. Si no llega en unos minutos, mirá en spam.
          </p>
          <Link href="/login" className="btn btn--full">
            Volver al login
          </Link>
        </div>
      ) : (
        <>
          <Link href="/login" className="btn btn--ghost back-link">
            <ArrowLeft size={14} /> Volver al login
          </Link>
          <h1 className="auth-title">Recuperar contraseña</h1>
          <p className="auth-subtitle">Te enviamos un link a tu email para restablecerla.</p>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="vos@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" className="btn btn--primary btn--full" disabled={loading}>
              {loading ? "Enviando..." : "Enviar link de recuperación"}
            </button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
