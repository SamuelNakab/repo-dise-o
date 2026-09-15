"use client";

import { useEffect, useState } from "react";
import { Plus, Truck } from "lucide-react";
import { api } from "@/lib/api";
import { etiquetaTipoVehiculo, etiquetaCondicion } from "@/lib/vehiculos";
import VehiculoForm, { IconoTipoVehiculo, type Vehiculo } from "@/components/conductor/VehiculoForm";

export default function MisVehiculosPage() {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    api.get<Vehiculo[]>("/api/conductores/mis-vehiculos")
      .then(setVehiculos)
      .catch((err) => setListError(err instanceof Error ? err.message : "Error al cargar vehículos"))
      .finally(() => setLoadingList(false));
  }, []);

  function mostrarToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }

  function guardado(nuevo: Vehiculo, habiaFoto: boolean) {
    setVehiculos((prev) => [...prev, nuevo]);
    setShowForm(false);
    mostrarToast(habiaFoto ? "Vehículo registrado (sin foto)" : "Vehículo registrado");
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar este vehículo?")) return;
    setDeletingId(id);
    try {
      await api.delete(`/api/conductores/mis-vehiculos/${id}`);
      setVehiculos((prev) => prev.filter((v) => v.id_vehiculo !== id));
    } catch (err) {
      mostrarToast(err instanceof Error ? err.message : "Error al eliminar el vehículo");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="page-medium">
      <div className="section-header">
        <div>
          <h2>Mis vehículos</h2>
          <p>Lo que cargues acá define qué viajes te llegan</p>
        </div>
        {!showForm && (
          <button className="btn btn--primary" onClick={() => setShowForm(true)} type="button">
            <Plus size={14} /> Registrar vehículo
          </button>
        )}
      </div>

      {showForm && (
        <div className="card card--form" style={{ marginBottom: 22 }}>
          <p className="card-title">Nuevo vehículo</p>
          <VehiculoForm onGuardado={guardado} onCancelar={() => setShowForm(false)} textoGuardar="Guardar vehículo" />
        </div>
      )}

      {listError && <div className="error-banner">{listError}</div>}

      {loadingList && <div className="card skeleton skeleton--row" />}

      {!loadingList && !listError && vehiculos.length === 0 && !showForm && (
        <div className="empty-state">
          <div className="empty-state__icon"><Truck size={24} /></div>
          <p className="empty-state__title">No tenés vehículos registrados</p>
          <p className="empty-state__text">Sin un vehículo no sos elegible para ningún viaje. Cargá el tuyo para empezar a recibirlos.</p>
          <button type="button" className="btn btn--primary" onClick={() => setShowForm(true)}>Registrar vehículo</button>
        </div>
      )}

      <div className="stack">
        {vehiculos.map((v) => (
          <div key={v.id_vehiculo} className="card veh-card">
            {/* Ícono del tipo y no la foto elegida: la foto todavía no se guarda. */}
            <div className="veh-card__icon"><IconoTipoVehiculo tipo={v.tipo_vehiculo} size={28} /></div>
            <div className="veh-card__body">
              <span className="veh-card__patente">{v.patente.toUpperCase()}</span>
              <p className="veh-card__title">{v.marca} {v.modelo}</p>
              <p className="veh-card__meta">{etiquetaTipoVehiculo(v.tipo_vehiculo)} · {v.anio} · {v.color}</p>
              {v.condiciones.length > 0 && (
                <div className="cred-list">
                  {v.condiciones.map((c) => <span key={c.id_condicion} className="cond">{etiquetaCondicion(c.condicion)}</span>)}
                </div>
              )}
            </div>
            <button
              className="btn btn--ghost btn--danger"
              disabled={deletingId === v.id_vehiculo}
              onClick={() => handleDelete(v.id_vehiculo)}
              type="button"
            >
              {deletingId === v.id_vehiculo ? "Eliminando..." : "Eliminar"}
            </button>
          </div>
        ))}
      </div>

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
