"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface PerfilData {
  nombre: string;
  apellido: string;
  email: string;
  dni?: string;
  telefono?: string;
  empresa?: string;
  cuit?: string;
  direccion?: string;
  fecha_registro?: string;
  rol: string;
}

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontSize: 11.5,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--ink-3)",
  marginBottom: 5,
};

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "7px 10px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--line-strong)",
  background: "var(--surface)",
  color: "var(--ink)",
  fontSize: 13,
  fontFamily: "var(--font-ui)",
  boxSizing: "border-box",
};

function Row({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="perfil-row">
      <p className="perfil-row__label">{label}</p>
      <p className={`perfil-row__value${value ? "" : " perfil-row__value--empty"}`}>{value ?? "—"}</p>
    </div>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  disabled = false,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (name: string, val: string) => void;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <label htmlFor={name} style={LABEL_STYLE}>{label}</label>
      <input
        id={name}
        type={type}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        disabled={disabled}
        style={{ ...INPUT_STYLE, opacity: disabled ? 0.6 : 1, cursor: disabled ? "not-allowed" : "text" }}
      />
    </div>
  );
}

export default function PerfilPage() {
  const [perfil, setPerfil] = useState<PerfilData | null>(null);
  const [draft, setDraft] = useState<Partial<PerfilData>>({});
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<PerfilData>("/api/auth/me")
      .then((data) => { setPerfil(data); setDraft(data); })
      .catch((e) => setError(e instanceof Error ? e.message : "Error al cargar el perfil"))
      .finally(() => setLoading(false));
  }, []);

  function startEdit() {
    setDraft({ ...perfil });
    setSaveError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setDraft({ ...perfil });
    setSaveError(null);
    setEditing(false);
  }

  async function saveEdit() {
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await api.put<PerfilData>("/api/auth/perfil", {
        nombre: draft.nombre,
        apellido: draft.apellido,
        telefono: draft.telefono,
        empresa: draft.empresa,
        cuit: draft.cuit,
        direccion: draft.direccion,
      });
      setPerfil(updated);
      setDraft(updated);
      setEditing(false);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  function handleChange(name: string, val: string) {
    setDraft((prev) => ({ ...prev, [name]: val }));
  }

  return (
    <div>
      <div className="section-header section-header--top" style={{ marginBottom: 24 }}>
        <div>
          <h2>Perfil</h2>
          <p>Tus datos de cuenta.</p>
        </div>
        {!loading && !error && perfil && !editing && (
          <button className="btn" onClick={startEdit} type="button">Editar</button>
        )}
      </div>

      {loading && (
        <div className="card perfil-stack">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ height: 36, background: "var(--surface-2)", borderRadius: 4 }} />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="error-banner" style={{ maxWidth: 560 }}>{error}</div>
      )}

      {!loading && !error && perfil && (
        <div className="perfil-stack">
          {/* Datos personales */}
          <div className="card">
            <p className="metric__label card-section-label">Datos personales</p>
            {editing ? (
              <div className="perfil-grid perfil-grid--edit">
                <Field label="Nombre" name="nombre" value={draft.nombre ?? ""} onChange={handleChange} />
                <Field label="Apellido" name="apellido" value={draft.apellido ?? ""} onChange={handleChange} />
                <Field label="DNI" name="dni" value={draft.dni ?? ""} onChange={handleChange} disabled />
                <Field label="Teléfono" name="telefono" value={draft.telefono ?? ""} onChange={handleChange} type="tel" />
              </div>
            ) : (
              <div className="perfil-grid">
                <Row label="Nombre" value={perfil.nombre} />
                <Row label="Apellido" value={perfil.apellido} />
                <Row label="DNI" value={perfil.dni} />
                <Row label="Teléfono" value={perfil.telefono} />
              </div>
            )}
          </div>

          {/* Datos de empresa */}
          <div className="card">
            <p className="metric__label card-section-label">Empresa</p>
            {editing ? (
              <div className="perfil-grid perfil-grid--edit">
                <Field label="Empresa" name="empresa" value={draft.empresa ?? ""} onChange={handleChange} />
                <Field label="CUIT" name="cuit" value={draft.cuit ?? ""} onChange={handleChange} />
                <div className="perfil-full">
                  <Field label="Dirección" name="direccion" value={draft.direccion ?? ""} onChange={handleChange} />
                </div>
              </div>
            ) : (
              <div className="perfil-grid">
                <Row label="Empresa" value={perfil.empresa} />
                <Row label="CUIT" value={perfil.cuit} />
                <div className="perfil-full">
                  <Row label="Dirección" value={perfil.direccion} />
                </div>
              </div>
            )}
          </div>

          {/* Cuenta */}
          <div className="card">
            <p className="metric__label card-section-label">Cuenta</p>
            <div className="perfil-grid">
              <Row label="Email" value={perfil.email} />
              <Row label="Rol" value={perfil.rol} />
              {perfil.fecha_registro && (
                <Row
                  label="Miembro desde"
                  value={new Date(perfil.fecha_registro).toLocaleDateString("es-AR", {
                    day: "2-digit", month: "long", year: "numeric",
                  })}
                />
              )}
            </div>
          </div>

          {/* Acciones de edición */}
          {editing && (
            <div className="perfil-actions">
              {saveError && <p className="auth-error">{saveError}</p>}
              <div className="perfil-actions__row">
                <button
                  className="btn btn--primary"
                  onClick={saveEdit}
                  disabled={saving}
                  type="button"
                >
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
                <button
                  className="btn btn--ghost"
                  onClick={cancelEdit}
                  disabled={saving}
                  type="button"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
