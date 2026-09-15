"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Car, Truck, ImagePlus } from "lucide-react";
import { api } from "@/lib/api";
import { TIPOS_VEHICULO, CONDICIONES_CARGA, ANIO_VEHICULO_MIN } from "@/lib/vehiculos";

export interface Vehiculo {
  id_vehiculo: number;
  patente: string;
  marca: string;
  modelo: string;
  anio: number;
  color: string;
  tipo_vehiculo: string;
  condiciones: { id_condicion: number; id_vehiculo: number; condicion: string }[];
}

const ICONO_TIPO: Record<string, typeof Car> = {
  utilitario: Car,
  pickup: Car,
  camioneta: Truck,
  furgon: Truck,
  camion: Truck,
};

export function IconoTipoVehiculo({ tipo, size = 22 }: { tipo: string; size?: number }) {
  const Icono = ICONO_TIPO[tipo] ?? Truck;
  return <Icono size={size} />;
}

const VACIO = { patente: "", marca: "", modelo: "", anio: "", color: "", tipo_vehiculo: "" };
const ANIO_MAX = new Date().getFullYear();

/**
 * Alta de vehículo compartida entre `registro-vehiculo` (onboarding) y
 * `mis-vehiculos`. Antes eran dos formularios copiados, uno dentro de una
 * `auth-card` que no pegaba con el resto del panel.
 *
 * La foto **no se guarda**: el backend no tiene dónde (PEDIDO-BACKEND → H). Se
 * deja elegir y previsualizar, rotulado "Próximamente", y el éxito avisa "sin
 * foto" para que no parezca que se perdió.
 */
export default function VehiculoForm({
  onGuardado,
  onCancelar,
  textoGuardar = "Registrar vehículo",
}: {
  onGuardado: (v: Vehiculo, habiaFoto: boolean) => void;
  onCancelar?: () => void;
  textoGuardar?: string;
}) {
  const [form, setForm] = useState(VACIO);
  const [condiciones, setCondiciones] = useState<string[]>([]);
  const [foto, setFoto] = useState<{ nombre: string; url: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Libera el object URL del preview al cambiarlo o al desmontar.
  useEffect(() => () => { if (foto) URL.revokeObjectURL(foto.url); }, [foto]);

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function toggleCondicion(val: string) {
    setCondiciones((prev) => (prev.includes(val) ? prev.filter((c) => c !== val) : [...prev, val]));
  }

  function elegirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setFoto({ nombre: archivo.name, url: URL.createObjectURL(archivo) });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.tipo_vehiculo) {
      setError("Elegí el tipo de vehículo");
      return;
    }
    setLoading(true);
    try {
      const nuevo = await api.post<Vehiculo>("/api/conductores/mis-vehiculos", {
        ...form,
        patente: form.patente.toUpperCase().replace(/\s+/g, ""),
        anio: parseInt(form.anio, 10),
        condiciones,
      });
      onGuardado(nuevo, foto != null);
      setForm(VACIO);
      setCondiciones([]);
      setFoto(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar el vehículo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <section className="form-section">
        <p className="form-section__title">Tipo de vehículo</p>
        <div className="option-cards" role="radiogroup" aria-label="Tipo de vehículo">
          {TIPOS_VEHICULO.map((t) => (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={form.tipo_vehiculo === t.value}
              className={`option-card${form.tipo_vehiculo === t.value ? " is-selected" : ""}`}
              onClick={() => setForm((p) => ({ ...p, tipo_vehiculo: t.value }))}
            >
              <span className="option-card__icon"><IconoTipoVehiculo tipo={t.value} size={18} /></span>
              <span className="option-card__title">{t.label}</span>
              <span className="option-card__desc">{t.desc}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="form-section">
        <p className="form-section__title">Datos del vehículo</p>
        <div className="form-grid form-grid--3">
          <div className="field">
            <label htmlFor="vh-patente">Patente</label>
            <input id="vh-patente" type="text" placeholder="AB123CD" value={form.patente} onChange={set("patente")} required minLength={6} maxLength={8} className="patente" />
          </div>
          <div className="field">
            <label htmlFor="vh-marca">Marca</label>
            <input id="vh-marca" type="text" placeholder="Ford" value={form.marca} onChange={set("marca")} required />
          </div>
          <div className="field">
            <label htmlFor="vh-modelo">Modelo</label>
            <input id="vh-modelo" type="text" placeholder="Transit" value={form.modelo} onChange={set("modelo")} required />
          </div>
          <div className="field">
            <label htmlFor="vh-anio">Año</label>
            <input id="vh-anio" type="number" inputMode="numeric" placeholder="2020" value={form.anio} onChange={set("anio")} required min={ANIO_VEHICULO_MIN} max={ANIO_MAX} />
          </div>
          <div className="field">
            <label htmlFor="vh-color">Color</label>
            <input id="vh-color" type="text" placeholder="Blanco" value={form.color} onChange={set("color")} required />
          </div>
        </div>
      </section>

      <section className="form-section">
        <p className="form-section__title">Qué carga puede llevar <span className="opt">(opcional)</span></p>
        <div className="cluster">
          {CONDICIONES_CARGA.map((c) => (
            <button
              key={c.value}
              type="button"
              aria-pressed={condiciones.includes(c.value)}
              className={`chip${condiciones.includes(c.value) ? " is-active" : ""}`}
              onClick={() => toggleCondicion(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <p className="field__hint">
          Sólo te llegan viajes cuyas condiciones cumple tu vehículo. Si no marcás ninguna, ves los viajes sin requisitos.
        </p>
      </section>

      <section className="form-section">
        <p className="form-section__title">
          Foto del vehículo <span className="badge-proximo">Próximamente</span>
        </p>
        <label className="dropzone">
          <input type="file" accept="image/*" onChange={elegirFoto} aria-label="Elegir foto del vehículo" />
          <span className="dropzone__thumb">
            {/* eslint-disable-next-line @next/next/no-img-element -- preview local de un object URL */}
            {foto ? <img src={foto.url} alt="Vista previa de la foto elegida" /> : <ImagePlus size={24} />}
          </span>
          <span className="dropzone__text">
            <strong>{foto ? foto.nombre : "Elegí una foto"}</strong>
            <span>
              Todavía no guardamos la foto: la vas a poder cargar cuando esté disponible. El resto de los datos sí se guarda.
            </span>
          </span>
        </label>
      </section>

      {error && <p className="auth-error">{error}</p>}

      <div className="form-actions form-actions--end">
        {onCancelar && <button type="button" className="btn btn--ghost" onClick={onCancelar}>Cancelar</button>}
        <button type="submit" className="btn btn--primary btn--lg" disabled={loading}>
          {loading ? "Guardando..." : textoGuardar}
        </button>
      </div>
    </form>
  );
}
