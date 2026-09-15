"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { useEmpresa } from "@/hooks/useEmpresa";
import type { EmpresaDetalle } from "@/lib/types-empresa";

function soloDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

export default function EmpresaPage() {
  const { empresaActiva, loading: loadingEmpresas, error: errorEmpresas, refetch } = useEmpresa();

  const [detalle, setDetalle] = useState<EmpresaDetalle | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(true);
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null);

  const [copiado, setCopiado] = useState(false);
  const [confirmandoRegenerar, setConfirmandoRegenerar] = useState(false);
  const [regenerando, setRegenerando] = useState(false);
  const [errorRegenerar, setErrorRegenerar] = useState<string | null>(null);

  const [formAbierto, setFormAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [cuit, setCuit] = useState("");
  const [creando, setCreando] = useState(false);
  const [errorCrear, setErrorCrear] = useState<string | null>(null);

  useEffect(() => {
    if (loadingEmpresas) return;

    if (!empresaActiva) {
      return;
    }

    let cancelado = false;
    api
      .get<EmpresaDetalle>(`/api/empresas/${empresaActiva.id_empresa}`)
      .then((data) => {
        if (!cancelado) {
          setDetalle(data);
          setErrorDetalle(null);
        }
      })
      .catch((e) => {
        if (!cancelado) {
          setErrorDetalle(e instanceof Error ? e.message : "Error al cargar la empresa");
          setDetalle(null);
        }
      })
      .finally(() => {
        if (!cancelado) setLoadingDetalle(false);
      });

    return () => {
      cancelado = true;
    };
  }, [loadingEmpresas, empresaActiva]);

  async function copiarCodigo(codigo: string) {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Si el navegador bloquea el clipboard no rompemos la UI.
    }
  }

  async function regenerarCodigo() {
    if (!empresaActiva) return;
    setRegenerando(true);
    setErrorRegenerar(null);
    try {
      const res = await api.post<{ id_empresa: number; codigo_afiliacion: string }>(
        `/api/empresas/${empresaActiva.id_empresa}/regenerar-codigo`,
        {}
      );
      setDetalle((prev) => (prev ? { ...prev, codigo_afiliacion: res.codigo_afiliacion } : prev));
      setConfirmandoRegenerar(false);
    } catch (e) {
      setErrorRegenerar(e instanceof Error ? e.message : "Error al regenerar el código");
    } finally {
      setRegenerando(false);
    }
  }

  async function crearEmpresa(e: FormEvent) {
    e.preventDefault();
    setErrorCrear(null);

    if (nombre.trim().length === 0) {
      setErrorCrear("El nombre es obligatorio.");
      return;
    }
    if (cuit.length !== 11) {
      setErrorCrear("El CUIT debe tener 11 dígitos.");
      return;
    }

    setCreando(true);
    try {
      await api.post("/api/empresas", { nombre: nombre.trim(), cuit });
      setNombre("");
      setCuit("");
      setFormAbierto(false);
      await refetch();
    } catch (e) {
      setErrorCrear(e instanceof Error ? e.message : "Error al crear la empresa");
    } finally {
      setCreando(false);
    }
  }

  const loading = loadingEmpresas || (empresaActiva !== null && loadingDetalle && !detalle);

  return (
    <div>
      <div className="section-header section-header--top" style={{ marginBottom: 24 }}>
        <div>
          <h2>Mi empresa</h2>
          <p>Datos de tu empresa y código de afiliación para conductores.</p>
        </div>
      </div>

      {errorEmpresas && <div className="error-banner">{errorEmpresas}</div>}
      {errorDetalle && <div className="error-banner">{errorDetalle}</div>}

      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ height: 36, background: "var(--surface-2)", borderRadius: 4 }} />
            ))}
          </div>
          <div className="card" style={{ height: 96, background: "var(--surface-2)", borderRadius: "var(--radius)" }} />
        </div>
      )}

      {!loading && !empresaActiva && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <p className="metric__label card-section-label">Sin empresa</p>
            <p style={{ fontSize: 13.5, color: "var(--ink-2)" }}>
              Todavía no tenés ninguna empresa registrada. Creá una para empezar a recibir viajes
              y afiliar conductores a tu flota.
            </p>
          </div>
          <FormularioCrearEmpresa
            nombre={nombre}
            cuit={cuit}
            creando={creando}
            error={errorCrear}
            onNombreChange={setNombre}
            onCuitChange={(v) => setCuit(soloDigitos(v).slice(0, 11))}
            onSubmit={crearEmpresa}
          />
        </div>
      )}

      {!loading && empresaActiva && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Datos de la empresa */}
          <div className="card">
            <p className="metric__label card-section-label">Datos de la empresa</p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: 20,
              }}
            >
              <div>
                <p className="metric__label">Nombre</p>
                <p style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginTop: 4 }}>
                  {empresaActiva.nombre}
                </p>
              </div>
              <div>
                <p className="metric__label">CUIT</p>
                <p style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginTop: 4, fontFamily: "var(--font-mono)" }}>
                  {empresaActiva.cuit}
                </p>
              </div>
              <div>
                <p className="metric__label">Estado</p>
                <p style={{ marginTop: 4 }}>
                  <span
                    className="status"
                    style={{
                      background: empresaActiva.activa ? "var(--ok-soft)" : "var(--err-soft)",
                      color: empresaActiva.activa ? "var(--ok)" : "var(--err)",
                    }}
                  >
                    {empresaActiva.activa ? "Activa" : "Inactiva"}
                  </span>
                </p>
              </div>
              <div>
                <p className="metric__label">Calificación promedio</p>
                <p className="metric__value" style={{ fontSize: 22, marginTop: 4 }}>
                  {detalle?.calificacion_promedio != null
                    ? `${detalle.calificacion_promedio.toFixed(1)} ★`
                    : "Sin calificaciones aún"}
                </p>
              </div>
              <div>
                <p className="metric__label">Conductores activos</p>
                <p className="metric__value" style={{ fontSize: 22, marginTop: 4 }}>
                  {detalle?.cantidad_conductores_activos ?? "—"}
                </p>
              </div>
              {empresaActiva._count && (
                <>
                  <div>
                    <p className="metric__label">Vehículos</p>
                    <p className="metric__value" style={{ fontSize: 22, marginTop: 4 }}>
                      {empresaActiva._count.vehiculos}
                    </p>
                  </div>
                  <div>
                    <p className="metric__label">Viajes</p>
                    <p className="metric__value" style={{ fontSize: 22, marginTop: 4 }}>
                      {empresaActiva._count.viajes}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Código de afiliación */}
          <div className="card" style={{ background: "linear-gradient(180deg, var(--surface) 65%, var(--accent-softer) 100%)" }}>
            <p className="metric__label card-section-label">Código de afiliación</p>
            <p style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 16 }}>
              Es el código que un conductor usa para afiliarse a tu empresa.
            </p>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 36,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  color: "var(--ink)",
                  margin: 0,
                }}
              >
                {empresaActiva.codigo_afiliacion}
              </p>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => copiarCodigo(empresaActiva.codigo_afiliacion)}
                >
                  {copiado ? "¡Copiado!" : "Copiar"}
                </button>
                {!confirmandoRegenerar && (
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => {
                      setErrorRegenerar(null);
                      setConfirmandoRegenerar(true);
                    }}
                  >
                    Regenerar
                  </button>
                )}
              </div>
            </div>

            {confirmandoRegenerar && (
              <div
                style={{
                  marginTop: 16,
                  padding: "12px 14px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--warn-soft)",
                  border: "1px solid var(--warn)",
                }}
              >
                <p style={{ fontSize: 13, color: "var(--ink)", marginBottom: 10 }}>
                  Al regenerar, el código actual (<strong>{empresaActiva.codigo_afiliacion}</strong>) deja de
                  funcionar de inmediato. Los conductores que todavía no se afiliaron van a necesitar el
                  código nuevo.
                </p>
                {errorRegenerar && (
                  <p style={{ fontSize: 12.5, color: "var(--err)", marginBottom: 10 }}>{errorRegenerar}</p>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={regenerarCodigo}
                    disabled={regenerando}
                  >
                    {regenerando ? "Regenerando..." : "Sí, regenerar código"}
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => setConfirmandoRegenerar(false)}
                    disabled={regenerando}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Crear otra empresa (colapsable) */}
          <div className="card">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setFormAbierto((v) => !v)}
              style={{ marginBottom: formAbierto ? 16 : 0 }}
            >
              {formAbierto ? "Cerrar" : "Crear otra empresa"}
            </button>
            {formAbierto && (
              <FormularioCrearEmpresa
                nombre={nombre}
                cuit={cuit}
                creando={creando}
                error={errorCrear}
                onNombreChange={setNombre}
                onCuitChange={(v) => setCuit(soloDigitos(v).slice(0, 11))}
                onSubmit={crearEmpresa}
                sinCard
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FormularioCrearEmpresa({
  nombre,
  cuit,
  creando,
  error,
  onNombreChange,
  onCuitChange,
  onSubmit,
  sinCard = false,
}: {
  nombre: string;
  cuit: string;
  creando: boolean;
  error: string | null;
  onNombreChange: (v: string) => void;
  onCuitChange: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  sinCard?: boolean;
}) {
  const contenido = (
    <form onSubmit={onSubmit} className="auth-form">
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label htmlFor="empresa-nombre" style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-3)" }}>
          Nombre
        </label>
        <input
          id="empresa-nombre"
          type="text"
          value={nombre}
          onChange={(e) => onNombreChange(e.target.value)}
          placeholder="Ej: Fletes García SRL"
          style={{
            padding: "7px 10px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--line-strong)",
            background: "var(--surface)",
            color: "var(--ink)",
            fontSize: 13,
            fontFamily: "var(--font-ui)",
          }}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label htmlFor="empresa-cuit" style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-3)" }}>
          CUIT (11 dígitos)
        </label>
        <input
          id="empresa-cuit"
          type="text"
          inputMode="numeric"
          value={cuit}
          onChange={(e) => onCuitChange(e.target.value)}
          placeholder="20123456789"
          style={{
            padding: "7px 10px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--line-strong)",
            background: "var(--surface)",
            color: "var(--ink)",
            fontSize: 13,
            fontFamily: "var(--font-mono)",
          }}
        />
      </div>
      {error && <p className="auth-error">{error}</p>}
      <div>
        <button type="submit" className="btn btn--primary" disabled={creando}>
          {creando ? "Creando..." : "Crear empresa"}
        </button>
      </div>
    </form>
  );

  if (sinCard) return contenido;

  return (
    <div className="card">
      <p className="metric__label card-section-label">Crear empresa</p>
      {contenido}
    </div>
  );
}
