"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { api } from "@/lib/api";
import { useEmpresa } from "@/hooks/useEmpresa";
import {
  CONDICIONES,
  CONDICION_LABEL,
  type Condicion,
  type NuevoVehiculo,
  type VehiculoFlota,
} from "@/lib/types-empresa";

const TIPOS = [
  { value: "camioneta", label: "Camioneta" },
  { value: "furgon", label: "Furgón" },
  { value: "camion", label: "Camión" },
  { value: "utilitario", label: "Utilitario" },
  { value: "pickup", label: "Pick-up" },
];

const TIPO_LABEL: Record<string, string> = {
  camioneta: "Camioneta",
  furgon: "Furgón",
  camion: "Camión",
  utilitario: "Utilitario",
  pickup: "Pick-up",
};

const ANIO_MAX = new Date().getFullYear();

const EMPTY_FORM = {
  patente: "",
  marca: "",
  modelo: "",
  anio: "",
  color: "",
  tipo_vehiculo: "",
};

export default function FlotaPage() {
  const { empresaActiva } = useEmpresa();

  const [vehiculos, setVehiculos] = useState<VehiculoFlota[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [condiciones, setCondiciones] = useState<Condicion[]>([]);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (!empresaActiva) return;
    api
      .get<VehiculoFlota[]>(`/api/empresas/${empresaActiva.id_empresa}/vehiculos`)
      .then((data) => {
        setVehiculos(data);
        setListError("");
      })
      .catch((err) => setListError(err instanceof Error ? err.message : "Error al cargar la flota"))
      .finally(() => setLoadingList(false));
  }, [empresaActiva]);

  async function refrescarVehiculos() {
    if (!empresaActiva) return;
    try {
      const data = await api.get<VehiculoFlota[]>(
        `/api/empresas/${empresaActiva.id_empresa}/vehiculos`
      );
      setVehiculos(data);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Error al cargar la flota");
    }
  }

  function set(field: keyof typeof form) {
    return (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function toggleCondicion(val: Condicion) {
    setCondiciones((prev) =>
      prev.includes(val) ? prev.filter((c) => c !== val) : [...prev, val]
    );
  }

  function validar(): string | null {
    const patente = form.patente.trim();
    if (patente.length < 6 || patente.length > 8) {
      return "La patente debe tener entre 6 y 8 caracteres.";
    }
    if (!form.marca.trim() || !form.modelo.trim() || !form.color.trim() || !form.tipo_vehiculo) {
      return "Completá todos los campos requeridos.";
    }
    const anio = parseInt(form.anio, 10);
    if (!Number.isInteger(anio) || anio < 1990 || anio > ANIO_MAX) {
      return `El año debe ser un número entre 1990 y ${ANIO_MAX}.`;
    }
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!empresaActiva) return;
    const error = validar();
    if (error) {
      setFormError(error);
      return;
    }
    setFormError("");
    setSubmitting(true);
    try {
      const payload: NuevoVehiculo = {
        patente: form.patente.trim(),
        marca: form.marca.trim(),
        modelo: form.modelo.trim(),
        anio: parseInt(form.anio, 10),
        color: form.color.trim(),
        tipo_vehiculo: form.tipo_vehiculo,
        condiciones,
      };
      await api.post<VehiculoFlota>(
        `/api/empresas/${empresaActiva.id_empresa}/vehiculos`,
        payload
      );
      setForm(EMPTY_FORM);
      setCondiciones([]);
      setShowForm(false);
      await refrescarVehiculos();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error al registrar el vehículo");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!empresaActiva) return;
    if (confirmingId !== id) {
      setConfirmingId(id);
      return;
    }
    setDeleteError("");
    setDeletingId(id);
    try {
      await api.delete(`/api/empresas/${empresaActiva.id_empresa}/vehiculos/${id}`);
      await refrescarVehiculos();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Error al dar de baja el vehículo");
    } finally {
      setDeletingId(null);
      setConfirmingId(null);
    }
  }

  if (!empresaActiva) {
    return (
      <div style={{ maxWidth: 680 }}>
        <div className="section-header" style={{ marginBottom: 28 }}>
          <h2>Flota</h2>
          <p>No tenés ninguna empresa todavía.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 28,
          gap: 16,
        }}
      >
        <div className="section-header">
          <h2>Flota</h2>
          <p>
            {loadingList
              ? "Cargando vehículos..."
              : `${vehiculos.length} vehículo${vehiculos.length === 1 ? "" : "s"} registrado${
                  vehiculos.length === 1 ? "" : "s"
                }`}
          </p>
        </div>
        <button
          className="btn btn--primary"
          onClick={() => {
            setShowForm((v) => !v);
            setFormError("");
          }}
        >
          {showForm ? "Cancelar" : "+ Agregar vehículo"}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 28, padding: "24px 28px" }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 18, color: "var(--ink)" }}>
            Nuevo vehículo
          </h2>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="field">
                <label htmlFor="nv-patente">Patente</label>
                <input
                  id="nv-patente"
                  type="text"
                  placeholder="ABC123"
                  value={form.patente}
                  onChange={set("patente")}
                  required
                  minLength={6}
                  maxLength={8}
                  style={{ textTransform: "uppercase" }}
                />
              </div>
              <div className="field">
                <label htmlFor="nv-anio">Año</label>
                <input
                  id="nv-anio"
                  type="number"
                  placeholder="2020"
                  value={form.anio}
                  onChange={set("anio")}
                  required
                  min={1990}
                  max={ANIO_MAX}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="field">
                <label htmlFor="nv-marca">Marca</label>
                <input
                  id="nv-marca"
                  type="text"
                  placeholder="Ford"
                  value={form.marca}
                  onChange={set("marca")}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="nv-modelo">Modelo</label>
                <input
                  id="nv-modelo"
                  type="text"
                  placeholder="Transit"
                  value={form.modelo}
                  onChange={set("modelo")}
                  required
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="field">
                <label htmlFor="nv-color">Color</label>
                <input
                  id="nv-color"
                  type="text"
                  placeholder="Blanco"
                  value={form.color}
                  onChange={set("color")}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="nv-tipo">Tipo de vehículo</label>
                <select id="nv-tipo" value={form.tipo_vehiculo} onChange={set("tipo_vehiculo")} required>
                  <option value="">Seleccioná...</option>
                  {TIPOS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field">
              <label>
                Condiciones <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>(opcional)</span>
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                {CONDICIONES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`chip${condiciones.includes(c) ? " is-active" : ""}`}
                    onClick={() => toggleCondicion(c)}
                  >
                    {CONDICION_LABEL[c]}
                  </button>
                ))}
              </div>
            </div>

            {formError && <p className="auth-error">{formError}</p>}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" className="btn btn--ghost" onClick={() => setShowForm(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn--primary" disabled={submitting}>
                {submitting ? "Registrando..." : "Guardar"}
              </button>
            </div>
          </form>
        </div>
      )}

      {deleteError && <p className="auth-error">{deleteError}</p>}
      {listError && <p className="auth-error">{listError}</p>}

      {loadingList && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="admin-skeleton"
              style={{ height: 84, borderRadius: "var(--radius)" }}
            />
          ))}
        </div>
      )}

      {!loadingList && !listError && vehiculos.length === 0 && (
        <div className="card" style={{ padding: "40px 28px", textAlign: "center" }}>
          <p style={{ color: "var(--ink-3)", fontSize: 14 }}>Todavía no hay vehículos en la flota.</p>
          <p style={{ color: "var(--ink-3)", fontSize: 13, marginTop: 6 }}>
            Agregá uno para poder asignarlo a los viajes.
          </p>
        </div>
      )}

      {!loadingList && !listError && vehiculos.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {vehiculos.map((v) => (
            <div
              key={v.id_vehiculo}
              className="card"
              style={{
                padding: "20px 24px",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                      fontSize: 16,
                      color: "var(--ink)",
                      letterSpacing: 1,
                    }}
                  >
                    {v.patente.toUpperCase()}
                  </span>
                  <span style={{ fontSize: 13, color: "var(--ink-3)" }}>
                    {TIPO_LABEL[v.tipo_vehiculo] ?? v.tipo_vehiculo}
                  </span>
                </div>
                <p style={{ fontSize: 14, color: "var(--ink-2)", marginBottom: 4 }}>
                  {v.marca} {v.modelo} — {v.anio} — {v.color}
                </p>
                {v.condiciones.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                    {v.condiciones.map((c, idx) => (
                      <span
                        key={c.id_condicion ?? idx}
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: "var(--info-soft)",
                          color: "var(--info)",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {CONDICION_LABEL[c.condicion] ?? c.condicion}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                className="btn btn--ghost"
                style={{ fontSize: 13, color: "var(--err)", flexShrink: 0 }}
                disabled={deletingId === v.id_vehiculo}
                onClick={() => handleDelete(v.id_vehiculo)}
              >
                {deletingId === v.id_vehiculo
                  ? "Dando de baja..."
                  : confirmingId === v.id_vehiculo
                    ? "¿Confirmar?"
                    : "Dar de baja"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
