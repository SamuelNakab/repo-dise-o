"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import VehiculoForm from "@/components/conductor/VehiculoForm";
import Stepper, { PASOS_REGISTRO_CONDUCTOR } from "@/components/Stepper";

function RegistroVehiculo() {
  const router = useRouter();
  const onboarding = useSearchParams().get("onboarding") === "1";
  const [toast, setToast] = useState<string | null>(null);

  function guardado(_: unknown, habiaFoto: boolean) {
    setToast(habiaFoto ? "Vehículo registrado (sin foto)" : "Vehículo registrado");
    setTimeout(() => router.push(onboarding ? "/conductor" : "/conductor/mis-vehiculos"), 1200);
  }

  return (
    <div className="page-medium">
      {onboarding && <Stepper pasos={PASOS_REGISTRO_CONDUCTOR} actual={3} />}

      <div className="section-header">
        <div>
          <h2>{onboarding ? "Último paso: tu vehículo" : "Registrar vehículo"}</h2>
          <p>Sin al menos un vehículo no te llega ningún viaje: la elegibilidad depende de lo que tu vehículo puede llevar.</p>
        </div>
      </div>

      <div className="card card--form">
        <VehiculoForm onGuardado={guardado} textoGuardar={onboarding ? "Guardar y ver viajes" : "Registrar vehículo"} />
      </div>

      {onboarding && (
        <p className="note note--warn" style={{ marginTop: 16 }}>
          Podés <Link href="/conductor" className="auth-link">omitirlo por ahora</Link>, pero hasta que cargues un vehículo la
          lista de viajes disponibles va a estar vacía.
        </p>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

export default function RegistroVehiculoPage() {
  return (
    <Suspense>
      <RegistroVehiculo />
    </Suspense>
  );
}
